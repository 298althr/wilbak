try {
    # Create PowerPoint application object
    $ppt = New-Object -ComObject PowerPoint.Application
    $ppt.Visible = $false
    
    # Define file paths
    $presentationPath = 'c:\Users\saviour\Documents\HFT\HedgeFund_Investor_Deck.pptx'
    $pdfPath = 'c:\Users\saviour\Documents\HFT\HedgeFund_Investor_Deck.pdf'
    
    # Open the presentation
    $presentation = $ppt.Presentations.Open($presentationPath)
    
    # Save as PDF (32 = ppSaveAsPDF)
    $presentation.SaveAs($pdfPath, 32)
    
    # Clean up
    $presentation.Close()
    $ppt.Quit()
    
    Write-Host "Successfully converted to PDF: $pdfPath"
} catch {
    Write-Host "Error: $_"
} finally {
    # Ensure PowerPoint process is terminated
    if ($ppt) {
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    }
}
