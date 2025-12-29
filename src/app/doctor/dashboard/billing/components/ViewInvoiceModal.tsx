'use client';
import React, { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { FaUser, FaEnvelope, FaPhone, FaClinicMedical } from 'react-icons/fa';
import api from '@/services/api';

interface ViewInvoiceModalProps {
    invoiceStub: any;
    onClose: () => void;
    viewScope: 'my' | 'clinic';
    clinicId?: number;
}

export const ViewInvoiceModal: React.FC<ViewInvoiceModalProps> = ({ invoiceStub, onClose, viewScope, clinicId }) => {
    const [fullInvoice, setFullInvoice] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!invoiceStub?.id) return;
            setIsLoading(true);
            try {
                if (viewScope === 'my') {
                    const res = await api.get(`/doctor/invoice/${invoiceStub.id}`);
                    // Handle multiple possible response structures
                    const data = res.data?.data || res.data?.invoice || res.data;
                    console.log('My View Invoice Data:', data);
                    setFullInvoice(data);
                } else if (clinicId) {
                    const res = await api.get(`/clinic-invoice/invoice/${invoiceStub.id}`, {
                        params: { clinic_id: clinicId }
                    });
                    // The response should be the invoice object directly
                    const data = res.data?.data || res.data?.invoice || res.data;
                    console.log('Clinic View Invoice Data:', data);
                    setFullInvoice(data);
                } else {
                    setFullInvoice(invoiceStub);
                }
            } catch (err) {
                console.warn("Fetch failed, using summary", err);
                setFullInvoice(invoiceStub);
            } finally {
                setIsLoading(false);
            }
        };

        // Always fetch to get full details with services
        fetchDetails();
    }, [invoiceStub, clinicId, viewScope]);

    const handlePrint = () => {
        const printContent = document.getElementById('invoice-print-content');
        if (!printContent) return;

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) return;

        // Get current data for print
        const displayData = fullInvoice || invoiceStub;
        let items: any[] = [];
        
        if (displayData.services?.length) {
            items = displayData.services; 
        } else if (displayData.InvoiceServices?.length) {
            items = displayData.InvoiceServices;
        } else if (displayData.invoice_services?.length) {
            items = displayData.invoice_services;
        }

        // Build services HTML
        const servicesHtml = items.map(item => {
            const serviceName = item.service?.name || item.Service?.name || item.name || 'Service';
            const price = parseFloat(item.price || 0).toFixed(2);
            return `
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${serviceName}</td>
                    <td class="text-right" style="padding: 12px; border-bottom: 1px solid #f3f4f6; text-align: right;">Rs. ${price}</td>
                </tr>
            `;
        }).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice #${invoiceId}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                            color: #1f2937;
                        }
                        .header {
                            text-align: center;
                            margin-bottom: 30px;
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 20px;
                        }
                        .header h1 {
                            font-size: 28px;
                            margin: 0 0 10px 0;
                        }
                        .clinic-info {
                            background: #eff6ff;
                            padding: 15px;
                            border-radius: 8px;
                            margin-bottom: 20px;
                            border: 1px solid #dbeafe;
                        }
                        .clinic-info strong {
                            color: #2563eb;
                        }
                        .info-section {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 30px;
                        }
                        .info-box {
                            flex: 1;
                        }
                        .info-box h3 {
                            font-size: 12px;
                            color: #6b7280;
                            text-transform: uppercase;
                            margin-bottom: 10px;
                        }
                        .info-box p {
                            margin: 5px 0;
                            font-size: 14px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                        }
                        th {
                            background: #f9fafb;
                            padding: 12px;
                            text-align: left;
                            font-size: 12px;
                            text-transform: uppercase;
                            border-bottom: 2px solid #e5e7eb;
                        }
                        td {
                            padding: 12px;
                            border-bottom: 1px solid #f3f4f6;
                        }
                        .text-right {
                            text-align: right;
                        }
                        .total-row {
                            background: #f9fafb;
                            font-weight: bold;
                            font-size: 16px;
                        }
                        .footer {
                            margin-top: 40px;
                            text-align: center;
                            color: #6b7280;
                            font-size: 12px;
                            border-top: 1px solid #e5e7eb;
                            padding-top: 20px;
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 4px 12px;
                            background: #d1fae5;
                            color: #065f46;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: 600;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>INVOICE #${invoiceId}</h1>
                        <p>Date: ${invoiceDate}</p>
                    </div>
                    
                    ${clinicName ? `
                        <div class="clinic-info">
                            <strong>Clinic:</strong> ${clinicName}
                        </div>
                    ` : ''}
                    
                    <div class="info-section">
                        <div class="info-box">
                            <h3>Billed To</h3>
                            <p><strong>${patientName}</strong></p>
                            ${patientEmail ? `<p>${patientEmail}</p>` : ''}
                            ${patientPhone ? `<p>${patientPhone}</p>` : ''}
                        </div>
                        <div class="info-box" style="text-align: right;">
                            <h3>Total Amount</h3>
                            <p style="font-size: 24px; font-weight: bold; font-family: monospace;">Rs. ${totalAmount}</p>
                            <span class="status-badge">PAID</span>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Service / Item</th>
                                <th class="text-right">Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${servicesHtml || '<tr><td colspan="2" style="text-align: center; padding: 20px; color: #9ca3af;">No services listed.</td></tr>'}
                        </tbody>
                        <tfoot>
                            <tr class="total-row">
                                <td>Total</td>
                                <td class="text-right">Rs. ${totalAmount}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div class="footer">
                        <p>Thank you for your business!</p>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const doc = new jsPDF();

            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = margin;

            const addText = (text: string, size: number, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
                doc.setFontSize(size);
                doc.setFont('helvetica', isBold ? 'bold' : 'normal');
                
                if (align === 'center') {
                    doc.text(text, pageWidth / 2, yPos, { align: 'center' });
                } else if (align === 'right') {
                    doc.text(text, pageWidth - margin, yPos, { align: 'right' });
                } else {
                    doc.text(text, margin, yPos);
                }
                yPos += size * 0.5;
            };

            // Title
            addText(`INVOICE #${invoiceId}`, 20, true, 'center');
            yPos += 5;

            // Date
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Date: ${invoiceDate}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 15;

            // Clinic
            if (clinicName) {
                addText(`Clinic: ${clinicName}`, 12, true);
                yPos += 5;
            }

            // Patient
            addText('BILLED TO:', 12, true);
            yPos += 2;
            addText(patientName, 11);
            if (patientEmail) addText(patientEmail, 10);
            yPos += 10;

            // Table Header
            doc.setFillColor(240, 240, 240);
            doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Service / Item', margin + 5, yPos + 7);
            doc.text('Price', pageWidth - margin - 5, yPos + 7, { align: 'right' });
            yPos += 15;

            // Services
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            
            if (items.length > 0) {
                items.forEach((item: any) => {
                    const serviceName = item.service?.name || item.Service?.name || item.name || 'Service';
                    const price = `Rs. ${parseFloat(item.price || 0).toFixed(2)}`;
                    
                    // Check if we need a new page
                    if (yPos > doc.internal.pageSize.getHeight() - 40) {
                        doc.addPage();
                        yPos = margin;
                    }
                    
                    doc.text(serviceName, margin + 5, yPos);
                    doc.text(price, pageWidth - margin - 5, yPos, { align: 'right' });
                    yPos += 8;
                });
            } else {
                doc.setFont('helvetica', 'italic');
                doc.text('No services listed', pageWidth / 2, yPos, { align: 'center' });
                yPos += 8;
            }

            // Total
            yPos += 5;
            doc.setLineWidth(0.5);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 10;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL:', margin + 5, yPos);
            doc.text(`Rs. ${totalAmount}`, pageWidth - margin - 5, yPos, { align: 'right' });

            // Footer
            yPos = doc.internal.pageSize.getHeight() - 20;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' });

            // Save
            doc.save(`Invoice-${invoiceId}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    if (!invoiceStub) return null;

    const invoiceId = invoiceStub.id;
    const invoiceDate = invoiceStub.invoice_date ? new Date(invoiceStub.invoice_date).toLocaleDateString() : 'N/A';
    const totalAmount = parseFloat(invoiceStub.total_amount || 0).toFixed(2);
    
    // Clinic Name Resolver - Check all possible sources
    let clinicName = '';
    
    // Priority 1: From stub (list view)
    if (invoiceStub.clinicName) {
        clinicName = invoiceStub.clinicName;
    } 
    // Priority 2: From fetched full invoice
    else if (fullInvoice?.clinic?.name) {
        clinicName = fullInvoice.clinic.name;
    } 
    // Priority 3: From stub's clinic object
    else if (invoiceStub.clinic?.name) {
        clinicName = invoiceStub.clinic.name;
    }
    
    console.log('Clinic Name Resolution:', { 
        stubClinicName: invoiceStub.clinicName,
        fullInvoiceClinicName: fullInvoice?.clinic?.name,
        stubClinicObjectName: invoiceStub.clinic?.name,
        resolved: clinicName 
    });
    
    let patientName = 'Unknown Patient';
    if (invoiceStub.patientName) {
        patientName = invoiceStub.patientName;
    } else {
        const p = fullInvoice?.patient || invoiceStub.patient || invoiceStub.ClinicPatient || invoiceStub.clinic_patient || {};
        if (p.first_name) patientName = `${p.first_name} ${p.last_name || ''}`.trim();
    }
    
    const displayPatient = fullInvoice?.patient || invoiceStub.patient || invoiceStub.ClinicPatient || {};
    const patientEmail = displayPatient.email || '';
    const patientPhone = displayPatient.phone_number || '';

    const displayData = fullInvoice || invoiceStub;
    let items: any[] = [];
    
    if (displayData.services?.length) {
        items = displayData.services; 
    } else if (displayData.InvoiceServices?.length) {
        items = displayData.InvoiceServices;
    } else if (displayData.invoice_services?.length) {
        items = displayData.invoice_services;
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Invoice #{invoiceId}</h3>
                        <p className="text-sm text-gray-500">Issued: {invoiceDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="animate-spin h-8 w-8 text-[var(--color-primary-brand)]" />
                        </div>
                    ) : (
                        <div id="invoice-print-content">
                            {/* Clinic Name */}
                            {clinicName && (
                                <div className="clinic-info mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-2">
                                        <FaClinicMedical className="text-blue-600 w-4 h-4" />
                                        <div>
                                            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Clinic</p>
                                            <p className="text-base font-bold text-gray-900">{clinicName}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Billed To */}
                            <div className="info-section flex flex-col md:flex-row justify-between mb-8 gap-6 p-6 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="info-box">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                                    <div className="flex items-center gap-2 mb-1">
                                        <FaUser className="text-gray-400 w-3 h-3" />
                                        <span className="font-bold text-lg text-gray-900">{patientName}</span>
                                    </div>
                                    {patientEmail && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <FaEnvelope className="text-gray-400 w-3 h-3" />
                                            <p className="text-sm text-gray-600">{patientEmail}</p>
                                        </div>
                                    )}
                                    {patientPhone && (
                                        <div className="flex items-center gap-2">
                                            <FaPhone className="text-gray-400 w-3 h-3" />
                                            <p className="text-sm text-gray-600">{patientPhone}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="info-box md:text-right">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Amount</h3>
                                    <p className="text-2xl font-black text-gray-900 font-mono">Rs. {totalAmount}</p>
                                    <div className="mt-2">
                                        <span className="status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            PAID
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Services Table */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="py-3 px-4 text-left font-semibold text-gray-700">Service / Item</th>
                                            <th className="py-3 px-4 text-right font-semibold text-gray-700">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.length > 0 ? items.map((item: any, i: number) => (
                                            <tr key={i}>
                                                <td className="py-3 px-4 text-gray-800">
                                                    {item.service?.name || item.Service?.name || item.name || 'Service'}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono text-gray-700 font-medium">
                                                    Rs. {parseFloat(item.price || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={2} className="py-8 text-center text-gray-400 italic">
                                                    No services listed.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200 total-row">
                                        <tr>
                                            <td className="py-3 px-4 font-bold text-gray-900">Total</td>
                                            <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">
                                                Rs. {totalAmount}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                    <Button variant="ghost" onClick={onClose}>Close</Button>
                    <Button 
                        variant="outline" 
                        onClick={handleDownload}
                        disabled={isDownloading || isLoading}
                        className="flex items-center gap-2"
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Download size={16} /> Download PDF
                            </>
                        )}
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handlePrint} 
                        disabled={isLoading}
                        className="flex items-center gap-2"
                    >
                        <Printer size={16} /> Print
                    </Button>
                </div>
            </div>
        </div>
    );
};