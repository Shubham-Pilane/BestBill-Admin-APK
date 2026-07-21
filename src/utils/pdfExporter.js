import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportAnalyticsPdf(elementId, reportTitle, dateRangeText, selectedHotelName) {
  const element = document.getElementById(elementId);
  if (!element) return false;

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0b0f19'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Background fill
    pdf.setFillColor(11, 15, 25);
    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

    // Header Title in PDF
    pdf.setFontSize(16);
    pdf.setTextColor(16, 185, 129); // Emerald color
    pdf.text('BestBill POS - Analytics Report', 10, 15);

    pdf.setFontSize(10);
    pdf.setTextColor(148, 163, 184);
    pdf.text(`Hotel: ${selectedHotelName}  |  Range: ${dateRangeText}  |  Generated: ${new Date().toLocaleDateString()}`, 10, 22);

    let heightLeft = imgHeight;
    let position = 28;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - position);

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.setFillColor(11, 15, 25);
      pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const cleanName = selectedHotelName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `BestBill_Report_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;

    const pdfBlob = pdf.output('blob');

    // 1. Try Web Share API (native mobile share sheet: save to downloads, drive, whatsapp, pdf viewer)
    if (navigator.share && navigator.canShare) {
      try {
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'BestBill Analytics Report',
            text: `Analytics Report for ${selectedHotelName}`
          });
          return true;
        }
      } catch (shareErr) {
        console.warn('Share API failed or user cancelled, falling back to download:', shareErr);
      }
    }

    // 2. Direct Blob Download (for browsers & mobile WebViews fallback)
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Also fallback to jsPDF save
    try {
      pdf.save(fileName);
    } catch (saveErr) {
      console.warn('pdf.save fallback:', saveErr);
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    return true;
  } catch (err) {
    console.error('PDF Generation Error:', err);
    return false;
  }
}
