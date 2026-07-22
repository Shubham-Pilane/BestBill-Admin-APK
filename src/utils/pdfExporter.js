import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

applyPlugin(jsPDF);
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function exportAnalyticsPdf(reportData) {
  try {
    const { hotelName, dateRangeText, summary, topItems } = reportData;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // 1. Header block
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(hotelName, 15, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Period: ${dateRangeText}`, 15, 23);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 29);

    // Title badge
    doc.setFillColor(14, 165, 233); // sky-500
    doc.rect(150, 10, 45, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SALES REPORT', 153, 18);

    // 2. Summary stats grid (Key Metrics)
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Key Metrics', 15, 50);

    doc.autoTable({
      startY: 55,
      head: [['Total Revenue', 'Total Bills', 'Cash Coll.', 'Online Coll.']],
      body: [[
        `Rs. ${Number(summary.total_revenue || 0).toFixed(2)}`,
        `${summary.total_orders || 0}`,
        `Rs. ${Number(summary.cash_collection || 0).toFixed(2)}`,
        `Rs. ${Number(summary.online_collection || 0).toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11, halign: 'center', cellPadding: 6 }
    });

    // 3. Sales Breakdown (Dine In vs Parcel)
    doc.setFontSize(14);
    doc.text('Sales Breakdown', 15, doc.lastAutoTable.finalY + 15);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Dine-In Sales', 'Parcel / Counter Sales']],
      body: [[
        `Rs. ${Number(summary.dine_in_sales || 0).toFixed(2)}`,
        `Rs. ${Number(summary.parcel_sales || 0).toFixed(2)}`
      ]],
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11, halign: 'center', cellPadding: 6 }
    });

    // 4. Top Selling Items
    doc.setFontSize(14);
    doc.text('Top Selling Items', 15, doc.lastAutoTable.finalY + 15);
    
    const itemsBody = (topItems || []).slice(0, 30).map(item => [
      item.item_name || item.name || 'Unknown',
      item.qty || 0,
      `Rs. ${Number(item.revenue || 0).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Item Name', 'Quantity Sold', 'Revenue Generated']],
      body: itemsBody.length > 0 ? itemsBody : [['No item sales recorded', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 5 }
    });

    // Generate blob
    const cleanName = hotelName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `BestBill_Report_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfBlob = doc.output('blob');

    if (Capacitor.isNativePlatform()) {
      // Native File Saving without Share Sheet
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        try {
          // Attempt to write to public external Downloads directory
          const writeResult = await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: base64data,
            directory: Directory.ExternalStorage,
            recursive: true
          }).catch(async (e) => {
            console.warn('ExternalStorage/Download blocked (Scoped Storage), falling back to Documents', e);
            // Fallback to Documents directory which is usually safer
            return await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents
            });
          });

          const fileUri = writeResult.uri;

          // Show Notification
          try {
            await LocalNotifications.requestPermissions();
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'PDF Downloaded',
                  body: `Report saved as ${fileName}`,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 1000) },
                  smallIcon: 'ic_stat_icon_config_sample', // default icon
                  extra: {
                    fileUri: fileUri
                  }
                }
              ]
            });
          } catch (notifErr) {
            console.warn('Local Notification failed, fallback to alert', notifErr);
            alert(`PDF Downloaded successfully: ${fileName}`);
          }
        } catch (e) {
          console.error('Capacitor File Error:', e);
          alert('Error saving PDF: ' + e.message);
        }
      };
      return true;
    } else {
      // Browser Fallback (Invisible A tag)
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    }
  } catch (err) {
    console.error('PDF Generation Error:', err);
    alert('Failed to generate PDF: ' + (err.message || err));
    return false;
  }
}

export async function exportRevenueAnalyticsPdf(reportData) {
  try {
    const { hotelName, dateRangeText, summary, dailyRows } = reportData;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // 1. Header block
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(hotelName, 15, 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Period: ${dateRangeText}`, 15, 23);
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 29);

    // Title badge
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(140, 10, 55, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('REVENUE ANALYTICS', 143, 18);

    // 2. Summary stats grid (Key Metrics)
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Revenue Overview', 15, 48);

    const totalDaysStr = `${summary.total_days || 0} Days`;
    doc.autoTable({
      startY: 53,
      head: [['Total Revenue', 'Cash Collection', 'Online Collection', 'Total Days']],
      body: [[
        `Rs. ${Number(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Rs. ${Number(summary.cash_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        `Rs. ${Number(summary.online_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        totalDaysStr
      ]],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, halign: 'center', cellPadding: 5 }
    });

    // 3. Daily Revenue Breakdown Table
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Revenue Breakdown', 15, doc.lastAutoTable.finalY + 14);

    const tableBody = (dailyRows || []).map(row => [
      row.formattedDate || row.date,
      `Rs. ${Number(row.cash_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs. ${Number(row.online_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs. ${Number(row.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    // Add Grand Totals row
    tableBody.push([
      'Grand Total',
      `Rs. ${Number(summary.cash_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs. ${Number(summary.online_collection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      `Rs. ${Number(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 18,
      head: [['Date', 'Cash Collection', 'Online Collection', 'Total Revenue']],
      body: tableBody.length > 1 ? tableBody : [['No daily sales records found', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 9, cellPadding: 4 },
      didParseCell: function(data) {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.textColor = [15, 23, 42];
        }
      }
    });

    const cleanName = hotelName.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `BestBill_Revenue_Analytics_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const pdfBlob = doc.output('blob');

    if (Capacitor.isNativePlatform()) {
      const reader = new FileReader();
      reader.readAsDataURL(pdfBlob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        try {
          const writeResult = await Filesystem.writeFile({
            path: `Download/${fileName}`,
            data: base64data,
            directory: Directory.ExternalStorage,
            recursive: true
          }).catch(async (e) => {
            console.warn('ExternalStorage/Download blocked, fallback to Documents', e);
            return await Filesystem.writeFile({
              path: fileName,
              data: base64data,
              directory: Directory.Documents
            });
          });

          const fileUri = writeResult.uri;
          try {
            await LocalNotifications.requestPermissions();
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'Analytics PDF Downloaded',
                  body: `Saved as ${fileName}`,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 1000) },
                  smallIcon: 'ic_stat_icon_config_sample',
                  extra: { fileUri: fileUri }
                }
              ]
            });
          } catch (notifErr) {
            console.warn('Local Notification failed', notifErr);
            alert(`PDF Downloaded successfully: ${fileName}`);
          }
        } catch (e) {
          console.error('Capacitor File Error:', e);
          alert('Error saving PDF: ' + e.message);
        }
      };
      return true;
    } else {
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      return true;
    }
  } catch (err) {
    console.error('Revenue Analytics PDF Error:', err);
    alert('Failed to generate Revenue Analytics PDF: ' + (err.message || err));
    return false;
  }
}

