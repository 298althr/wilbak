-- ============================================================
--  HEDGE FUND AI TRADING PIPELINE — COMPLETE DATABASE SCHEMA
--  PostgreSQL 15+
--  Covers: instruments, market data, enrichment, AI signals,
--          trades, risk, portfolio, pipeline audit, budget
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "timescaledb";   -- time-series optimisation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- fuzzy text search on tickers

-- ──────────────────────────────────────────────────────────────
-- SECTION 1: INSTRUMENTS
-- Master registry of every tradeable symbol in the system
-- ──────────────────────────────────────────────────────────────

CREATE TYPE instrument_type AS ENUM (
  'EQUITY', 'FUTURE', 'OPTION', 'ETF', 'FOREX', 'CRYPTO', 'INDEX'
);

CREATE TYPE exchange_code AS ENUM (
  'NYSE', 'NASDAQ', 'COMEX', 'CME', 'CBOE', 'LSE', 'FOREX', 'CRYPTO'
);

CREATE TABLE instruments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker                VARCHAR(20) NOT NULL UNIQUE,
  company_id            VARCHAR(50),
  name                  VARCHAR(255) NOT NULL,
  entity_type           instrument_type NOT NULL,
  exchange              exchange_code NOT NULL,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  sector                VARCHAR(100),
  industry              VARCHAR(100),
  country               CHAR(2),
  website               TEXT,
  description           TEXT,
  employees             INTEGER,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  added_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_instruments_ticker ON instruments USING GIN (ticker gin_trgm_ops);
CREATE INDEX idx_instruments_type   ON instruments (entity_type);
CREATE INDEX idx_instruments_sector ON instruments (sector);


-- ──────────────────────────────────────────────────────────────
-- SECTION 2: RAW MARKET DATA (Base Scraper Records)
-- One record per ticker per scrape cycle
-- ──────────────────────────────────────────────────────────────

CREATE TABLE market_snapshots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  scraped_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                VARCHAR(50) NOT NULL DEFAULT 'scraper_api',

  -- Price fields
  closing_price         NUMERIC(18,6),
  previous_close        NUMERIC(18,6),
  open_price            NUMERIC(18,6),
  bid                   NUMERIC(18,6),
  ask                   NUMERIC(18,6),
  bid_size              INTEGER,
  ask_size              INTEGER,

  -- Range
  day_low               NUMERIC(18,6),
  day_high              NUMERIC(18,6),
  week_52_low           NUMERIC(18,6),
  week_52_high          NUMERIC(18,6),

  -- Volume
  volume                BIGINT,
  avg_volume            BIGINT,

  -- Market metrics
  market_cap            NUMERIC(24,2),
  beta                  NUMERIC(8,4),
  pe_ratio              NUMERIC(12,4),
  eps                   NUMERIC(12,4),
  forward_pe            NUMERIC(12,4),
  peg_ratio             NUMERIC(12,4),
  price_to_book         NUMERIC(12,4),
  price_to_sales        NUMERIC(12,4),
  enterprise_value      NUMERIC(24,2),
  ev_to_ebitda          NUMERIC(12,4),
  ev_to_revenue         NUMERIC(12,4),

  -- Dividend
  dividend_yield        NUMERIC(8,4),
  ex_dividend_date      DATE,
  earnings_date         DATE,

  -- Analyst consensus
  target_est            NUMERIC(18,6),
  recommendation_rating VARCHAR(20),
  analyst_price_target  NUMERIC(18,6),

  -- Null tracking
  null_fields           TEXT[],        -- list of fields that came back null
  completeness_pct      NUMERIC(5,2),  -- 0-100 completeness score
  raw_payload           JSONB          -- full original scraper response
);

-- TimescaleDB hypertable for time-series queries
SELECT create_hypertable('market_snapshots', 'scraped_at');
CREATE INDEX idx_ms_instrument ON market_snapshots (instrument_id, scraped_at DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 3: L2 MARKET DEPTH (Order Book)
-- Polygon.io paid tier — refreshed every 500ms during market hours
-- ──────────────────────────────────────────────────────────────

CREATE TABLE order_book_depth (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                VARCHAR(50) NOT NULL DEFAULT 'polygon_l2',

  -- Level 1
  best_bid              NUMERIC(18,6),
  best_ask              NUMERIC(18,6),
  best_bid_size         INTEGER,
  best_ask_size         INTEGER,
  spread                NUMERIC(18,6) GENERATED ALWAYS AS (best_ask - best_bid) STORED,
  spread_bps            NUMERIC(10,4),

  -- L2 depth (top 10 levels each side as JSONB arrays)
  -- Format: [{"price": 100.5, "size": 500}, ...]
  bids                  JSONB,  -- top 10 bid levels
  asks                  JSONB,  -- top 10 ask levels

  -- Derived microstructure
  mid_price             NUMERIC(18,6),
  imbalance_ratio       NUMERIC(8,4),  -- (bid_vol - ask_vol) / (bid_vol + ask_vol)
  total_bid_depth       BIGINT,
  total_ask_depth       BIGINT,
  vwap_intraday         NUMERIC(18,6)
);

SELECT create_hypertable('order_book_depth', 'captured_at');
CREATE INDEX idx_obd_instrument ON order_book_depth (instrument_id, captured_at DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 4: OHLCV + TECHNICAL INDICATORS
-- Alpha Vantage — per bar (1min / 5min / 15min / daily)
-- ──────────────────────────────────────────────────────────────

CREATE TYPE bar_interval AS ENUM (
  '1min', '5min', '15min', '30min', '60min', 'daily', 'weekly'
);

CREATE TABLE ohlcv_bars (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  bar_time              TIMESTAMPTZ NOT NULL,
  interval              bar_interval NOT NULL,
  source                VARCHAR(50) NOT NULL DEFAULT 'alpha_vantage',

  open                  NUMERIC(18,6) NOT NULL,
  high                  NUMERIC(18,6) NOT NULL,
  low                   NUMERIC(18,6) NOT NULL,
  close                 NUMERIC(18,6) NOT NULL,
  volume                BIGINT NOT NULL,
  adjusted_close        NUMERIC(18,6),

  -- Technical indicators (computed or from AV)
  rsi_14                NUMERIC(8,4),
  macd_line             NUMERIC(12,6),
  macd_signal           NUMERIC(12,6),
  macd_histogram        NUMERIC(12,6),
  bb_upper              NUMERIC(18,6),
  bb_middle             NUMERIC(18,6),
  bb_lower              NUMERIC(18,6),
  ema_9                 NUMERIC(18,6),
  ema_21                NUMERIC(18,6),
  ema_50                NUMERIC(18,6),
  ema_200               NUMERIC(18,6),
  atr_14                NUMERIC(18,6),
  adx_14                NUMERIC(8,4),
  vwap                  NUMERIC(18,6),
  volume_sma_20         BIGINT,
  volume_ratio          NUMERIC(8,4),  -- current / sma_20

  UNIQUE (instrument_id, bar_time, interval)
);

SELECT create_hypertable('ohlcv_bars', 'bar_time');
CREATE INDEX idx_ohlcv_instrument ON ohlcv_bars (instrument_id, interval, bar_time DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 5: OPTIONS GREEKS (ORATS / Tradier)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE options_greeks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                VARCHAR(50) NOT NULL DEFAULT 'orats',

  -- Option contract identifier
  option_symbol         VARCHAR(30) NOT NULL,  -- OCC symbol
  expiration_date       DATE NOT NULL,
  strike_price          NUMERIC(12,4) NOT NULL,
  option_type           CHAR(1) NOT NULL CHECK (option_type IN ('C','P')),

  -- Greeks
  delta                 NUMERIC(10,6),
  gamma                 NUMERIC(10,6),
  theta                 NUMERIC(10,6),
  vega                  NUMERIC(10,6),
  rho                   NUMERIC(10,6),

  -- Volatility
  implied_vol           NUMERIC(10,6),
  iv_percentile         NUMERIC(6,2),
  iv_rank               NUMERIC(6,2),
  historical_vol_30     NUMERIC(10,6),

  -- Pricing
  bid                   NUMERIC(12,4),
  ask                   NUMERIC(12,4),
  last_price            NUMERIC(12,4),
  open_interest         INTEGER,
  volume                INTEGER,

  -- Underlying at time of capture
  underlying_price      NUMERIC(18,6),
  days_to_expiry        INTEGER
);

SELECT create_hypertable('options_greeks', 'captured_at');
CREATE INDEX idx_og_instrument ON options_greeks (instrument_id, captured_at DESC);
CREATE INDEX idx_og_expiry     ON options_greeks (expiration_date, option_type);


-- ──────────────────────────────────────────────────────────────
-- SECTION 6: FUNDAMENTALS (FMP)
-- Quarterly/annual financials and ratios
-- ──────────────────────────────────────────────────────────────

CREATE TYPE period_type AS ENUM ('Q1','Q2','Q3','Q4','FY','TTM');

CREATE TABLE financials (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  period                period_type NOT NULL,
  fiscal_year           SMALLINT NOT NULL,
  reported_at           DATE,
  source                VARCHAR(50) NOT NULL DEFAULT 'fmp',

  -- Income statement
  revenue               NUMERIC(24,2),
  gross_profit          NUMERIC(24,2),
  operating_income      NUMERIC(24,2),
  net_income            NUMERIC(24,2),
  ebitda                NUMERIC(24,2),
  eps_diluted           NUMERIC(12,4),
  eps_basic             NUMERIC(12,4),

  -- Balance sheet
  total_assets          NUMERIC(24,2),
  total_liabilities     NUMERIC(24,2),
  total_equity          NUMERIC(24,2),
  total_cash            NUMERIC(24,2),
  total_debt            NUMERIC(24,2),
  debt_to_equity        NUMERIC(10,4),

  -- Cash flow
  operating_cashflow    NUMERIC(24,2),
  capex                 NUMERIC(24,2),
  free_cashflow         NUMERIC(24,2),
  levered_fcf           NUMERIC(24,2),

  -- Margins
  gross_margin          NUMERIC(8,4),
  operating_margin      NUMERIC(8,4),
  net_margin            NUMERIC(8,4),
  return_on_equity      NUMERIC(8,4),
  return_on_assets      NUMERIC(8,4),

  UNIQUE (instrument_id, period, fiscal_year)
);

CREATE TABLE earnings_estimates (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  captured_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source                VARCHAR(50) NOT NULL DEFAULT 'fmp',
  period                period_type NOT NULL,
  fiscal_year           SMALLINT NOT NULL,

  -- Estimates
  eps_estimate_avg      NUMERIC(12,4),
  eps_estimate_low      NUMERIC(12,4),
  eps_estimate_high     NUMERIC(12,4),
  eps_actual            NUMERIC(12,4),
  eps_surprise          NUMERIC(12,4),
  eps_surprise_pct      NUMERIC(8,4),

  revenue_estimate_avg  NUMERIC(24,2),
  revenue_actual        NUMERIC(24,2),
  revenue_surprise_pct  NUMERIC(8,4),

  num_analysts          SMALLINT,
  earnings_date         TIMESTAMPTZ
);

CREATE INDEX idx_ee_instrument ON earnings_estimates (instrument_id, fiscal_year, period);


-- ──────────────────────────────────────────────────────────────
-- SECTION 7: ANALYST DATA (Finnhub)
-- ──────────────────────────────────────────────────────────────

CREATE TYPE rating_action AS ENUM (
  'upgrade', 'downgrade', 'initiate', 'reiterate', 'maintain'
);

CREATE TABLE analyst_ratings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  published_at          TIMESTAMPTZ NOT NULL,
  source                VARCHAR(50) NOT NULL DEFAULT 'finnhub',
  firm                  VARCHAR(100),
  analyst_name          VARCHAR(100),
  action                rating_action,
  rating_from           VARCHAR(30),
  rating_to             VARCHAR(30),
  price_target_from     NUMERIC(18,6),
  price_target_to       NUMERIC(18,6)
);

CREATE INDEX idx_ar_instrument ON analyst_ratings (instrument_id, published_at DESC);

CREATE TABLE insider_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  transaction_date      DATE NOT NULL,
  source                VARCHAR(50) NOT NULL DEFAULT 'finnhub',
  name                  VARCHAR(150),
  title                 VARCHAR(100),
  transaction_type      VARCHAR(10),  -- 'buy' or 'sell'
  shares                BIGINT,
  price_per_share       NUMERIC(18,6),
  total_value           NUMERIC(24,2) GENERATED ALWAYS AS (shares * price_per_share) STORED,
  shares_after          BIGINT,
  filing_date           DATE
);

CREATE INDEX idx_it_instrument ON insider_transactions (instrument_id, transaction_date DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 8: NEWS & SENTIMENT
-- ──────────────────────────────────────────────────────────────

CREATE TABLE news_articles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  published_at          TIMESTAMPTZ NOT NULL,
  source_name           VARCHAR(100),
  source_provider       VARCHAR(50),  -- 'finnhub', 'newsapi', etc.
  headline              TEXT NOT NULL,
  summary               TEXT,
  url                   TEXT UNIQUE,
  image_url             TEXT,
  is_paywalled          BOOLEAN DEFAULT FALSE
);

CREATE TABLE news_instrument_links (
  news_id               UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  instrument_id         UUID REFERENCES instruments(id) ON DELETE CASCADE,
  relevance_score       NUMERIC(5,4),  -- 0-1
  PRIMARY KEY (news_id, instrument_id)
);

CREATE TABLE ai_sentiment_scores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  scored_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version         VARCHAR(50) NOT NULL DEFAULT 'claude-sonnet-4',
  source_type           VARCHAR(30) NOT NULL,  -- 'news', 'social', 'analyst', 'combined'

  -- Scores
  sentiment_score       NUMERIC(6,4) NOT NULL,  -- -1 to +1
  confidence            NUMERIC(5,4) NOT NULL,   -- 0 to 1
  magnitude             NUMERIC(5,4),             -- strength of signal

  -- Classification
  sentiment_label       VARCHAR(10) CHECK (sentiment_label IN ('bullish','bearish','neutral')),
  risk_flag             VARCHAR(10) CHECK (risk_flag IN ('low','medium','high','critical')),
  black_swan_detected   BOOLEAN DEFAULT FALSE,

  -- Content
  news_summary          TEXT,
  key_entities          TEXT[],
  reasoning             TEXT,

  -- Source news IDs used
  source_news_ids       UUID[],
  token_count           INTEGER
);

SELECT create_hypertable('ai_sentiment_scores', 'scored_at');
CREATE INDEX idx_ass_instrument ON ai_sentiment_scores (instrument_id, scored_at DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 9: MARKET REGIME (AI Regime Classifier)
-- Refreshed every 15 minutes during market hours
-- ──────────────────────────────────────────────────────────────

CREATE TYPE regime_state AS ENUM (
  'trending_bull', 'trending_bear', 'mean_reverting', 'high_volatility',
  'low_volatility', 'crisis', 'undefined'
);

CREATE TABLE market_regimes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID REFERENCES instruments(id) ON DELETE CASCADE,  -- NULL = global regime
  classified_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version         VARCHAR(50) NOT NULL DEFAULT 'claude-sonnet-4',

  regime                regime_state NOT NULL,
  confidence            NUMERIC(5,4) NOT NULL,
  prev_regime           regime_state,
  regime_changed        BOOLEAN DEFAULT FALSE,

  -- Input signals used
  adx_value             NUMERIC(8,4),
  vix_level             NUMERIC(8,4),
  breadth_indicator     NUMERIC(8,4),
  rolling_vol_20        NUMERIC(8,4),

  -- Strategy selection
  recommended_strategy  VARCHAR(50),  -- 'momentum', 'mean_reversion', 'hold', 'defensive'
  active_playbook       JSONB,        -- full strategy config for this regime
  reasoning             TEXT
);

SELECT create_hypertable('market_regimes', 'classified_at');


-- ──────────────────────────────────────────────────────────────
-- SECTION 10: ENRICHED RECORDS (Merged Pipeline Output)
-- Final merged record after all enrichment nodes complete
-- ──────────────────────────────────────────────────────────────

CREATE TABLE enriched_records (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  enriched_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pipeline_run_id       UUID NOT NULL,  -- FK to pipeline_runs

  -- Source record IDs
  snapshot_id           UUID REFERENCES market_snapshots(id),
  regime_id             UUID REFERENCES market_regimes(id),
  sentiment_id          UUID REFERENCES ai_sentiment_scores(id),

  -- Completeness
  completeness_pct      NUMERIC(5,2) NOT NULL,
  null_fields_remaining TEXT[],
  enrichment_providers  TEXT[],  -- which providers contributed

  -- Merged payload
  merged_data           JSONB NOT NULL,  -- full enriched record
  is_valid              BOOLEAN NOT NULL DEFAULT TRUE,
  validation_errors     TEXT[]
);

CREATE INDEX idx_er_instrument ON enriched_records (instrument_id, enriched_at DESC);
CREATE INDEX idx_er_pipeline   ON enriched_records (pipeline_run_id);


-- ──────────────────────────────────────────────────────────────
-- SECTION 11: CONFIDENCE SCORING & TRADE SIGNALS
-- The 72%+ gate that controls every execution
-- ──────────────────────────────────────────────────────────────

CREATE TABLE confidence_scores (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  scored_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enriched_record_id    UUID REFERENCES enriched_records(id),

  -- Factor scores (each 0-1)
  technical_alignment   NUMERIC(5,4),   -- weight 25%
  volume_confirmation   NUMERIC(5,4),   -- weight 20%
  ai_sentiment          NUMERIC(5,4),   -- weight 20%
  risk_reward_ratio     NUMERIC(5,4),   -- weight 15%
  regime_filter         NUMERIC(5,4),   -- weight 10%
  correlation_guard     NUMERIC(5,4),   -- weight 10%

  -- Composite
  composite_score       NUMERIC(5,4) NOT NULL,
  passes_gate           BOOLEAN NOT NULL,  -- TRUE if >= 0.72
  gate_threshold        NUMERIC(5,4) NOT NULL DEFAULT 0.72,

  -- Outcome
  action                VARCHAR(10) CHECK (action IN ('buy','sell','hold','skip')),
  direction             VARCHAR(5)  CHECK (direction IN ('long','short')),
  stop_loss             NUMERIC(18,6),
  take_profit           NUMERIC(18,6),
  suggested_size_pct    NUMERIC(6,4),  -- % of capital

  reasoning             TEXT,
  model_version         VARCHAR(50) NOT NULL DEFAULT 'claude-sonnet-4'
);

SELECT create_hypertable('confidence_scores', 'scored_at');
CREATE INDEX idx_cs_instrument ON confidence_scores (instrument_id, scored_at DESC);
CREATE INDEX idx_cs_passes     ON confidence_scores (passes_gate, scored_at DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 12: CORRELATION MATRIX
-- Rolling 20-day correlations, refreshed every 4 hours
-- ──────────────────────────────────────────────────────────────

CREATE TABLE correlation_matrix (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  computed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  instrument_a_id       UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  instrument_b_id       UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  lookback_days         SMALLINT NOT NULL DEFAULT 20,
  correlation           NUMERIC(8,6) NOT NULL,  -- -1 to +1
  exceeds_threshold     BOOLEAN GENERATED ALWAYS AS (ABS(correlation) > 0.7) STORED,
  UNIQUE (instrument_a_id, instrument_b_id, computed_at)
);

CREATE INDEX idx_cm_pair ON correlation_matrix (instrument_a_id, instrument_b_id, computed_at DESC);
CREATE INDEX idx_cm_exceeds ON correlation_matrix (exceeds_threshold) WHERE exceeds_threshold = TRUE;


-- ──────────────────────────────────────────────────────────────
-- SECTION 13: TRADES
-- Every executed, rejected, or paper trade
-- ──────────────────────────────────────────────────────────────

CREATE TYPE trade_status AS ENUM (
  'pending', 'submitted', 'filled', 'partial', 'cancelled',
  'rejected', 'expired', 'paper'
);

CREATE TYPE order_type AS ENUM (
  'market', 'limit', 'stop', 'stop_limit', 'trailing_stop'
);

CREATE TYPE trade_strategy AS ENUM (
  'momentum_breakout', 'vwap_reversion', 'earnings_catalyst',
  'sentiment_swing', 'volume_spike_fade', 'regime_switch', 'manual'
);

CREATE TABLE trades (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  confidence_score_id   UUID REFERENCES confidence_scores(id),
  portfolio_id          UUID NOT NULL,  -- FK to portfolios

  -- Timing
  signal_at             TIMESTAMPTZ NOT NULL,
  submitted_at          TIMESTAMPTZ,
  filled_at             TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,

  -- Order details
  status                trade_status NOT NULL DEFAULT 'pending',
  direction             VARCHAR(5) NOT NULL CHECK (direction IN ('long','short')),
  order_type            order_type NOT NULL DEFAULT 'market',
  strategy              trade_strategy NOT NULL,

  -- Sizing
  quantity              NUMERIC(18,6) NOT NULL,
  entry_price           NUMERIC(18,6),
  fill_price            NUMERIC(18,6),
  stop_loss             NUMERIC(18,6),
  take_profit           NUMERIC(18,6),
  trailing_stop_pct     NUMERIC(6,4),

  -- Exit
  exit_price            NUMERIC(18,6),
  exit_reason           VARCHAR(50),  -- 'take_profit','stop_loss','signal_reversal','manual','circuit_breaker'

  -- P&L
  gross_pnl             NUMERIC(18,6),
  commission            NUMERIC(12,6),
  slippage_cost         NUMERIC(12,6),
  net_pnl               NUMERIC(18,6) GENERATED ALWAYS AS (gross_pnl - commission - slippage_cost) STORED,

  -- Execution quality
  intended_price        NUMERIC(18,6),
  actual_slippage_bps   NUMERIC(8,4),
  execution_latency_ms  INTEGER,
  ibkr_order_id         VARCHAR(50),

  -- RL execution decision
  rl_order_type_chosen  order_type,
  rl_confidence         NUMERIC(5,4),

  notes                 TEXT
);

CREATE INDEX idx_trades_instrument ON trades (instrument_id, signal_at DESC);
CREATE INDEX idx_trades_portfolio  ON trades (portfolio_id, signal_at DESC);
CREATE INDEX idx_trades_status     ON trades (status);
CREATE INDEX idx_trades_strategy   ON trades (strategy);


-- ──────────────────────────────────────────────────────────────
-- SECTION 14: PORTFOLIO & POSITIONS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE portfolios (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(100) NOT NULL,
  description           TEXT,
  currency              CHAR(3) NOT NULL DEFAULT 'USD',
  ibkr_account_id       VARCHAR(50),
  is_paper              BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Capital
  initial_capital       NUMERIC(18,2) NOT NULL,
  current_cash          NUMERIC(18,2) NOT NULL,
  infrastructure_budget NUMERIC(10,2),  -- monthly infra cost tier

  -- Risk limits
  max_position_pct      NUMERIC(6,4) NOT NULL DEFAULT 0.02,   -- 2% per trade
  max_portfolio_var     NUMERIC(6,4) NOT NULL DEFAULT 0.05,   -- 5% VaR limit
  max_daily_loss_pct    NUMERIC(6,4) NOT NULL DEFAULT 0.02,   -- 2% daily loss per instrument
  max_correlation       NUMERIC(6,4) NOT NULL DEFAULT 0.70,   -- correlation ceiling
  min_confidence_gate   NUMERIC(5,4) NOT NULL DEFAULT 0.72,   -- 72% AI gate

  -- Circuit breaker
  circuit_breaker_active BOOLEAN NOT NULL DEFAULT FALSE,
  circuit_breaker_reason TEXT,
  circuit_breaker_at    TIMESTAMPTZ
);

CREATE TABLE positions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id          UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  instrument_id         UUID NOT NULL REFERENCES instruments(id) ON DELETE CASCADE,
  opened_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,
  is_open               BOOLEAN NOT NULL DEFAULT TRUE,

  direction             VARCHAR(5) NOT NULL CHECK (direction IN ('long','short')),
  quantity              NUMERIC(18,6) NOT NULL,
  avg_entry_price       NUMERIC(18,6) NOT NULL,
  current_price         NUMERIC(18,6),
  market_value          NUMERIC(18,2),
  unrealized_pnl        NUMERIC(18,2),
  realized_pnl          NUMERIC(18,2),
  total_commission      NUMERIC(12,6),

  stop_loss             NUMERIC(18,6),
  take_profit           NUMERIC(18,6),

  UNIQUE (portfolio_id, instrument_id, is_open)
);

CREATE INDEX idx_positions_portfolio  ON positions (portfolio_id, is_open);
CREATE INDEX idx_positions_instrument ON positions (instrument_id, is_open);


-- ──────────────────────────────────────────────────────────────
-- SECTION 15: RISK MANAGEMENT
-- VaR, Sharpe, drawdown tracking
-- ──────────────────────────────────────────────────────────────

CREATE TABLE risk_snapshots (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id          UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  snapshot_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Portfolio metrics
  total_nav             NUMERIC(18,2) NOT NULL,
  daily_pnl             NUMERIC(18,2),
  daily_pnl_pct         NUMERIC(8,4),
  open_positions        SMALLINT,

  -- Risk metrics
  portfolio_var_1d      NUMERIC(8,6),   -- 1-day 95% VaR as % of NAV
  portfolio_var_5d      NUMERIC(8,6),   -- 5-day 95% VaR
  sharpe_ratio          NUMERIC(8,4),
  sortino_ratio         NUMERIC(8,4),
  max_drawdown_pct      NUMERIC(8,4),
  current_drawdown_pct  NUMERIC(8,4),

  -- Exposure
  gross_exposure_pct    NUMERIC(8,4),
  net_exposure_pct      NUMERIC(8,4),
  largest_position_pct  NUMERIC(8,4),
  max_pair_correlation  NUMERIC(8,6),

  -- Alerts
  var_breach            BOOLEAN DEFAULT FALSE,
  drawdown_breach       BOOLEAN DEFAULT FALSE,
  correlation_breach    BOOLEAN DEFAULT FALSE
);

SELECT create_hypertable('risk_snapshots', 'snapshot_at');
CREATE INDEX idx_rs_portfolio ON risk_snapshots (portfolio_id, snapshot_at DESC);


-- ──────────────────────────────────────────────────────────────
-- SECTION 16: PIPELINE AUDIT & MONITORING
-- Full traceability of every pipeline run
-- ──────────────────────────────────────────────────────────────

CREATE TYPE pipeline_status AS ENUM (
  'running', 'completed', 'failed', 'partial', 'cancelled'
);

CREATE TABLE pipeline_runs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  status                pipeline_status NOT NULL DEFAULT 'running',

  ticker                VARCHAR(20),
  instrument_id         UUID REFERENCES instruments(id),

  -- Node results
  nodes_attempted       SMALLINT DEFAULT 0,
  nodes_succeeded       SMALLINT DEFAULT 0,
  nodes_failed          SMALLINT DEFAULT 0,

  -- Costs
  scraper_api_calls     SMALLINT DEFAULT 0,
  finnhub_api_calls     SMALLINT DEFAULT 0,
  fmp_api_calls         SMALLINT DEFAULT 0,
  alphavantage_calls    SMALLINT DEFAULT 0,
  polygon_api_calls     SMALLINT DEFAULT 0,
  orats_api_calls       SMALLINT DEFAULT 0,
  claude_api_calls      SMALLINT DEFAULT 0,
  claude_tokens_used    INTEGER DEFAULT 0,

  -- Timing (ms)
  ingest_ms             INTEGER,
  null_detect_ms        INTEGER,
  enrichment_ms         INTEGER,
  l2_depth_ms           INTEGER,
  greeks_ms             INTEGER,
  regime_ai_ms          INTEGER,
  sentiment_ai_ms       INTEGER,
  correlation_ms        INTEGER,
  confidence_gate_ms    INTEGER,
  execution_ai_ms       INTEGER,
  total_ms              INTEGER,

  error_message         TEXT,
  error_node            VARCHAR(50),
  metadata              JSONB
);

CREATE INDEX idx_pr_instrument ON pipeline_runs (instrument_id, started_at DESC);
CREATE INDEX idx_pr_status     ON pipeline_runs (status, started_at DESC);

-- Node-level detail
CREATE TABLE pipeline_node_logs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pipeline_run_id       UUID NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  node_name             VARCHAR(50) NOT NULL,
  node_order            SMALLINT NOT NULL,
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ,
  status                VARCHAR(20) NOT NULL DEFAULT 'running',
  duration_ms           INTEGER,
  provider              VARCHAR(50),
  fields_filled         TEXT[],
  fields_failed         TEXT[],
  api_calls_made        SMALLINT DEFAULT 0,
  error_message         TEXT,
  response_payload      JSONB
);

CREATE INDEX idx_pnl_run ON pipeline_node_logs (pipeline_run_id, node_order);


-- ──────────────────────────────────────────────────────────────
-- SECTION 17: CIRCUIT BREAKER LOG
-- Every halt, anomaly detection, and kill switch event
-- ──────────────────────────────────────────────────────────────

CREATE TYPE breaker_trigger AS ENUM (
  'daily_loss_limit', 'portfolio_var_breach', 'ai_anomaly',
  'fat_finger_detected', 'flash_crash', 'api_data_glitch',
  'correlation_breach', 'manual_override', 'drawdown_limit'
);

CREATE TABLE circuit_breaker_events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id          UUID REFERENCES portfolios(id),
  instrument_id         UUID REFERENCES instruments(id),
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  trigger_type          breaker_trigger NOT NULL,
  trigger_value         NUMERIC(18,6),
  threshold_value       NUMERIC(18,6),
  description           TEXT NOT NULL,
  trades_halted         INTEGER DEFAULT 0,
  resolved_by           VARCHAR(100),  -- 'auto', 'human:<name>'
  resolution_notes      TEXT
);


-- ──────────────────────────────────────────────────────────────
-- SECTION 18: BUDGET & API COST TRACKING
-- Maps to the 6 infrastructure tiers
-- ──────────────────────────────────────────────────────────────

CREATE TYPE infra_tier AS ENUM (
  'mvp_200', 'early_live_500', 'semi_pro_1000',
  'institutional_2000', 'professional_5000', 'full_institutional_10000'
);

CREATE TABLE infra_budgets (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id          UUID NOT NULL REFERENCES portfolios(id),
  tier                  infra_tier NOT NULL,
  budget_usd            NUMERIC(10,2) NOT NULL,
  effective_from        DATE NOT NULL,
  effective_to          DATE,

  -- Projected metrics for this tier
  projected_win_rate    NUMERIC(5,4),
  projected_rr          NUMERIC(6,4),
  projected_trades_day  SMALLINT,
  projected_slippage_bps NUMERIC(6,2),
  error_factor          NUMERIC(5,4)
);

CREATE TABLE api_cost_log (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id          UUID REFERENCES portfolios(id),
  logged_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  month_year            CHAR(7) NOT NULL,  -- 'YYYY-MM'
  provider              VARCHAR(50) NOT NULL,

  calls_made            INTEGER NOT NULL DEFAULT 0,
  tokens_used           INTEGER,
  estimated_cost_usd    NUMERIC(10,4),
  actual_cost_usd       NUMERIC(10,4),
  plan_name             VARCHAR(100),
  is_over_budget        BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_acl_month    ON api_cost_log (month_year, provider);
CREATE INDEX idx_acl_portfolio ON api_cost_log (portfolio_id, month_year);


-- ──────────────────────────────────────────────────────────────
-- SECTION 19: INVESTMENT PLAN PROJECTIONS
-- The 6×4 matrix from the investment plan tool
-- ──────────────────────────────────────────────────────────────

CREATE TABLE investment_plan_scenarios (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tier                  infra_tier NOT NULL,
  infra_budget_usd      NUMERIC(10,2) NOT NULL,
  starting_capital_usd  NUMERIC(12,2) NOT NULL,
  ibkr_account_funded   BOOLEAN DEFAULT TRUE,

  -- Inputs
  win_rate              NUMERIC(5,4) NOT NULL,
  risk_reward           NUMERIC(6,4) NOT NULL,
  trades_per_day        SMALLINT NOT NULL,
  slippage_bps          NUMERIC(6,2) NOT NULL,
  error_factor          NUMERIC(5,4) NOT NULL,
  position_size_pct     NUMERIC(5,4) NOT NULL DEFAULT 0.02,
  trading_days          SMALLINT NOT NULL DEFAULT 21,

  -- Outputs
  projected_profit_mid  NUMERIC(12,2) NOT NULL,
  projected_profit_low  NUMERIC(12,2) NOT NULL,
  projected_profit_high NUMERIC(12,2) NOT NULL,
  monthly_roi_pct       NUMERIC(8,4) NOT NULL,
  annual_projected      NUMERIC(14,2) NOT NULL,
  infra_covered         BOOLEAN NOT NULL,

  UNIQUE (tier, starting_capital_usd)
);


-- ──────────────────────────────────────────────────────────────
-- SECTION 20: USERS & ACCESS CONTROL
-- For investor dashboard and human override tracking
-- ──────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'admin', 'portfolio_manager', 'analyst', 'investor_read_only', 'api_service'
);

CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  full_name             VARCHAR(150),
  role                  user_role NOT NULL DEFAULT 'investor_read_only',
  portfolio_ids         UUID[],    -- portfolios this user can access
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login            TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  api_key_hash          VARCHAR(255) UNIQUE  -- for API service accounts
);

CREATE TABLE audit_log (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurred_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id               UUID REFERENCES users(id),
  portfolio_id          UUID REFERENCES portfolios(id),
  action                VARCHAR(100) NOT NULL,
  entity_type           VARCHAR(50),
  entity_id             UUID,
  old_value             JSONB,
  new_value             JSONB,
  ip_address            INET,
  notes                 TEXT
);

CREATE INDEX idx_audit_user      ON audit_log (user_id, occurred_at DESC);
CREATE INDEX idx_audit_portfolio ON audit_log (portfolio_id, occurred_at DESC);
CREATE INDEX idx_audit_entity    ON audit_log (entity_type, entity_id);


-- ──────────────────────────────────────────────────────────────
-- VIEWS
-- ──────────────────────────────────────────────────────────────

-- Latest enriched record per instrument
CREATE VIEW v_latest_enriched AS
  SELECT DISTINCT ON (instrument_id)
    er.*, i.ticker, i.name, i.entity_type
  FROM enriched_records er
  JOIN instruments i ON er.instrument_id = i.id
  ORDER BY instrument_id, enriched_at DESC;

-- Today's trade summary per portfolio
CREATE VIEW v_daily_trade_summary AS
  SELECT
    portfolio_id,
    DATE(signal_at) AS trade_date,
    strategy,
    COUNT(*) AS total_trades,
    COUNT(*) FILTER (WHERE net_pnl > 0) AS winning_trades,
    COUNT(*) FILTER (WHERE net_pnl < 0) AS losing_trades,
    ROUND(SUM(net_pnl)::NUMERIC, 2) AS total_net_pnl,
    ROUND(AVG(net_pnl)::NUMERIC, 2) AS avg_pnl_per_trade,
    ROUND((COUNT(*) FILTER (WHERE net_pnl > 0)::NUMERIC / NULLIF(COUNT(*),0) * 100), 2) AS win_rate_pct
  FROM trades
  WHERE status = 'filled'
  GROUP BY portfolio_id, DATE(signal_at), strategy;

-- Active circuit breakers
CREATE VIEW v_active_circuit_breakers AS
  SELECT cb.*, p.name AS portfolio_name, i.ticker
  FROM circuit_breaker_events cb
  LEFT JOIN portfolios p ON cb.portfolio_id = p.id
  LEFT JOIN instruments i ON cb.instrument_id = i.id
  WHERE cb.resolved_at IS NULL
  ORDER BY cb.triggered_at DESC;

-- Monthly API cost summary
CREATE VIEW v_monthly_api_costs AS
  SELECT
    month_year,
    portfolio_id,
    SUM(estimated_cost_usd) AS total_estimated_usd,
    SUM(actual_cost_usd) AS total_actual_usd,
    JSONB_OBJECT_AGG(provider, estimated_cost_usd) AS by_provider
  FROM api_cost_log
  GROUP BY month_year, portfolio_id
  ORDER BY month_year DESC;


-- ──────────────────────────────────────────────────────────────
-- SEED: Infrastructure tier projections (the 6×4 matrix)
-- ──────────────────────────────────────────────────────────────

INSERT INTO investment_plan_scenarios
  (tier, infra_budget_usd, starting_capital_usd, win_rate, risk_reward,
   trades_per_day, slippage_bps, error_factor,
   projected_profit_mid, projected_profit_low, projected_profit_high,
   monthly_roi_pct, annual_projected, infra_covered)
VALUES
  -- $200 tier
  ('mvp_200',               200,   1000, 0.60, 1.5,  6, 15.0, 0.78,   106,  76,  136,  10.6, 1272,  FALSE),
  ('mvp_200',               200,   2000, 0.60, 1.5,  6, 15.0, 0.78,   212, 153,  272,  10.6, 2544,   TRUE),
  ('mvp_200',               200,   5000, 0.60, 1.5,  6, 15.0, 0.78,   530, 382,  678,  10.6, 6360,   TRUE),
  ('mvp_200',               200,  10000, 0.60, 1.5,  6, 15.0, 0.78,  1060, 763, 1357,  10.6,12720,   TRUE),
  -- $500 tier
  ('early_live_500',        500,   1000, 0.63, 1.8,  8, 12.0, 0.80,   179, 129,  229,  17.9, 2148,  FALSE),
  ('early_live_500',        500,   2000, 0.63, 1.8,  8, 12.0, 0.80,   358, 258,  458,  17.9, 4296,  FALSE),
  ('early_live_500',        500,   5000, 0.63, 1.8,  8, 12.0, 0.80,   895, 644, 1146,  17.9,10740,   TRUE),
  ('early_live_500',        500,  10000, 0.63, 1.8,  8, 12.0, 0.80,  1790,1289, 2291,  17.9,21480,   TRUE),
  -- $1000 tier
  ('semi_pro_1000',        1000,   1000, 0.66, 2.0, 10, 10.0, 0.83,   262, 189,  335,  26.2, 3144,  FALSE),
  ('semi_pro_1000',        1000,   2000, 0.66, 2.0, 10, 10.0, 0.83,   524, 377,  671,  26.2, 6288,  FALSE),
  ('semi_pro_1000',        1000,   5000, 0.66, 2.0, 10, 10.0, 0.83,  1310, 943, 1677,  26.2,15720,   TRUE),
  ('semi_pro_1000',        1000,  10000, 0.66, 2.0, 10, 10.0, 0.83,  2620,1886, 3354,  26.2,31440,   TRUE),
  -- $2000 tier
  ('institutional_2000',   2000,   1000, 0.68, 2.4, 12,  8.0, 0.86,   392, 282,  502,  39.2, 4704,  FALSE),
  ('institutional_2000',   2000,   2000, 0.68, 2.4, 12,  8.0, 0.86,   784, 565, 1004,  39.2, 9408,  FALSE),
  ('institutional_2000',   2000,   5000, 0.68, 2.4, 12,  8.0, 0.86,  1960,1411, 2509,  39.2,23520,  FALSE),
  ('institutional_2000',   2000,  10000, 0.68, 2.4, 12,  8.0, 0.86,  3920,2822, 5018,  39.2,47040,   TRUE),
  -- $5000 tier
  ('professional_5000',    5000,   1000, 0.72, 2.8, 15,  5.0, 0.90,   640, 461,  819,  64.0, 7680,  FALSE),
  ('professional_5000',    5000,   2000, 0.72, 2.8, 15,  5.0, 0.90,  1280, 922, 1638,  64.0,15360,  FALSE),
  ('professional_5000',    5000,   5000, 0.72, 2.8, 15,  5.0, 0.90,  3200,2304, 4096,  64.0,38400,  FALSE),
  ('professional_5000',    5000,  10000, 0.72, 2.8, 15,  5.0, 0.90,  6400,4608, 8192,  64.0,76800,   TRUE),
  -- $10000 tier
  ('full_institutional_10000',10000,1000, 0.75, 3.2, 20,  3.0, 0.93,   974, 701, 1247,  97.4,11688,  FALSE),
  ('full_institutional_10000',10000,2000, 0.75, 3.2, 20,  3.0, 0.93,  1948,1403, 2493,  97.4,23376,  FALSE),
  ('full_institutional_10000',10000,5000, 0.75, 3.2, 20,  3.0, 0.93,  4870,3506, 6234,  97.4,58440,  FALSE),
  ('full_institutional_10000',10000,10000,0.75, 3.2, 20,  3.0, 0.93,  9740,7013,12467,  97.4,116880,  FALSE);


-- ──────────────────────────────────────────────────────────────
-- END OF SCHEMA
-- Total tables: 23 | Views: 4 | Hypertables: 7
-- Requires: PostgreSQL 15+, TimescaleDB 2.x
-- ──────────────────────────────────────────────────────────────
