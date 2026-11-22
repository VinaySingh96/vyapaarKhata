import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal.js';
import { useToast } from './Toast.js';
import { useI18n } from '../i18n/index.js';
import { apiFetch } from '../utils/api.js';
import {
  InvoiceShareDetailsDto,
  InvoiceCustomerContactDto,
  normalizePhoneNumber,
  maskPhoneNumber,
  buildInvoiceShareMessage,
  buildWhatsAppClickToChatUrl,
} from '@vyapaarkhata/domain';
import { canShareFiles, shareFile } from '../utils/browserShare.js';
import { generateInvoicePdf, InvoicePdfData } from '../utils/invoicePdfGenerator.js';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  onPdfShared?: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  onPdfShared,
}) => {
  const { t, language } = useI18n();
  const toast = useToast();
  const isHi = language === 'hi';

  const [isLoading, setIsLoading] = useState(false);
  const [shareDetails, setShareDetails] = useState<InvoiceShareDetailsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Contact Selection
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [manualPhoneInput, setManualPhoneInput] = useState<string>('');

  // Consent & Message State
  const [hasConfirmedConsent, setHasConfirmedConsent] = useState(true);
  const [messageText, setMessageText] = useState<string>('');
  const [isPdfSharing, setIsPdfSharing] = useState(false);

  // Fetch share details when modal opens
  useEffect(() => {
    if (!isOpen || !invoiceId) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadDetails() {
      try {
        const res = await apiFetch(`/api/v1/sales/invoices/${invoiceId}/share-details`);
        const json = await res.json();

        if (!isMounted) return;

        if (res.ok && json.success && json.data) {
          const data: InvoiceShareDetailsDto = json.data;
          setShareDetails(data);

          // Select primary or dedicated WhatsApp contact by default
          const contacts = data.customer?.contacts || [];
          const bestContact =
            contacts.find((c) => c.isDedicatedWhatsApp) ||
            contacts.find((c) => c.isPrimary) ||
            contacts[0];

          if (bestContact) {
            setSelectedContactId(bestContact.id);
            setManualPhoneInput(bestContact.phone);
          } else {
            setSelectedContactId('manual');
            setManualPhoneInput('');
          }

          // Initial message preview
          const initialMsg = buildInvoiceShareMessage({
            customerName: data.customer?.displayName || 'Customer',
            businessName: data.businessName || 'vyapaarKhata Store',
            invoiceNumber: data.invoiceNumber,
            invoiceDate: data.invoiceDate,
            currencySymbol: data.currencySymbol || '₹',
            grandTotal: data.grandTotal,
            amountPaid: data.amountPaid,
            balanceDue: data.balanceDue,
            paymentStatus: data.paymentStatus,
            language: language === 'hi' ? 'hi' : 'en',
          });
          setMessageText(initialMsg);
        } else {
          const errMsg = json.error?.message || 'Failed to load invoice sharing details';
          setError(errMsg);
          toast.error(errMsg);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'Network error fetching invoice sharing details';
        setError(msg);
        toast.error(msg);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoiceId, language]);

  // Handle contact switch
  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId);
    if (!shareDetails) return;

    if (contactId === 'manual') {
      setManualPhoneInput('');
    } else {
      const found = shareDetails.customer.contacts.find((c) => c.id === contactId);
      if (found) {
        setManualPhoneInput(found.phone);
      }
    }
  };

  // Normalized Destination Phone
  const phoneValidation = useMemo(() => {
    return normalizePhoneNumber(manualPhoneInput, 'IN');
  }, [manualPhoneInput]);

  // Selected contact object
  const activeContact = useMemo(() => {
    if (!shareDetails || selectedContactId === 'manual') return null;
    return shareDetails.customer.contacts.find((c) => c.id === selectedContactId) || null;
  }, [shareDetails, selectedContactId]);

  // Record audit event helper
  const recordShareAction = async (action: string, destination?: string) => {
    try {
      await apiFetch(`/api/v1/sales/invoices/${invoiceId}/share-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          maskedDestination: destination ? maskPhoneNumber(destination) : undefined,
          platform: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      });
    } catch {
      // Fire-and-forget audit log should not block UI
    }
  };

  // Open WhatsApp Click to Chat
  const handleOpenWhatsApp = async () => {
    if (!phoneValidation.valid || !phoneValidation.waDigits) {
      toast.warning(
        isHi
          ? 'कृपया एक वैध मोबाइल नंबर दर्ज करें या चुनें।'
          : 'Please select or enter a valid mobile number.'
      );
      return;
    }

    if (!hasConfirmedConsent) {
      toast.warning(
        isHi
          ? 'कृपया ग्राहक की व्हाट्सएप पर बिल प्राप्त करने की सहमति की पुष्टि करें।'
          : 'Please confirm that the customer consented to receive the invoice via WhatsApp.'
      );
      return;
    }

    try {
      const url = buildWhatsAppClickToChatUrl(phoneValidation.waDigits, messageText);

      // Record audit action
      recordShareAction('WHATSAPP_CHAT_OPEN_REQUESTED', phoneValidation.phoneE164);

      // Open Click to Chat URL in new window with safe rel
      const win = window.open(url, '_blank', 'noopener,noreferrer');

      if (!win) {
        toast.warning(
          isHi
            ? 'पॉपअप ब्लॉक हो गया था। कृपया संदेश कॉपी करें या पॉपअप की अनुमति दें।'
            : 'Popup blocked by browser. Please allow popups or copy the message text.'
        );
      } else {
        toast.success(
          isHi
            ? 'व्हाट्सएप खुल गया है। कृपया संदेश देखें और वहां "Send" दबाएं।'
            : 'WhatsApp opened. Review the message and press Send inside WhatsApp.'
        );
      }

      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to open WhatsApp');
    }
  };

  // Copy Message Text
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      toast.success(isHi ? 'संदेश क्लिपबोर्ड पर कॉपी हो गया!' : 'Message copied to clipboard!');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Share or Download PDF
  const handleSharePdf = async () => {
    if (!shareDetails) return;
    setIsPdfSharing(true);

    try {
      // Fetch full invoice lines if needed
      const fullRes = await apiFetch(`/api/v1/sales/invoices/${invoiceId}`);
      const fullJson = await fullRes.json();
      const invoiceData = fullJson.data || {};

      const pdfInput: InvoicePdfData = {
        invoiceNumber: shareDetails.invoiceNumber,
        invoiceDate: shareDetails.invoiceDate,
        businessName: shareDetails.businessName,
        businessAddress: shareDetails.businessAddress,
        businessPhone: shareDetails.businessPhone,
        businessGstin: shareDetails.businessGstin,
        customerName: shareDetails.customer.displayName,
        customerPhone: phoneValidation.valid ? phoneValidation.phoneE164 : undefined,
        customerAddress: invoiceData.customerAddress,
        currencySymbol: shareDetails.currencySymbol,
        subtotal: shareDetails.grandTotal - (invoiceData.taxTotal || 0),
        taxTotal: invoiceData.taxTotal || 0,
        grandTotal: shareDetails.grandTotal,
        amountPaid: shareDetails.amountPaid,
        balanceDue: shareDetails.balanceDue,
        lines: (invoiceData.lines || []).map((l: any, i: number) => ({
          sno: i + 1,
          name: l.productName || l.descriptionSnapshot || 'Item',
          quantity: l.quantity,
          unit: l.unitSymbol || 'pcs',
          price: l.unitPrice,
          taxRate: l.taxRate || 18,
          taxAmount: l.taxAmount,
          lineTotal: l.lineTotal,
        })),
      };

      const pdfResult = generateInvoicePdf(pdfInput);

      // Check if Web Share API file sharing is supported
      if (canShareFiles(pdfResult.file)) {
        recordShareAction('PDF_SHARE_REQUESTED');
        const shareOutcome = await shareFile({
          file: pdfResult.file,
          title: `Invoice ${shareDetails.invoiceNumber}`,
          text: `Invoice from ${shareDetails.businessName}`,
        });

        if (shareOutcome.status === 'shared') {
          recordShareAction('SHARE_SHEET_OPENED');
          toast.success(isHi ? 'पीडीएफ सफलतापूर्वक शेयर किया गया।' : 'Invoice PDF shared successfully.');
        } else if (shareOutcome.status === 'aborted') {
          // User cancelled native sheet
        } else {
          // Fallback to download
          pdfResult.download();
          recordShareAction('PDF_DOWNLOADED');
          toast.info(
            isHi
              ? 'पीडीएफ डाउनलोड हो गया। व्हाट्सएप खोलकर फाइल संलग्न करें।'
              : 'PDF downloaded. Open WhatsApp and attach the downloaded file.'
          );
        }
      } else {
        // Desktop or unsupported context: direct download with instruction
        pdfResult.download();
        recordShareAction('PDF_DOWNLOADED');
        toast.info(
          isHi
            ? '📄 बिल पीडीएफ डाउनलोड हो गया! ग्राहक का व्हाट्सएप चैट खोलकर फाइल अटैच करें।'
            : '📄 Invoice PDF downloaded! Open customer WhatsApp chat and attach the downloaded file.'
        );
      }

      if (onPdfShared) onPdfShared();
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invoice PDF');
    } finally {
      setIsPdfSharing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isHi ? '💬 व्हाट्सएप पर बिल शेयर करें' : '💬 Share Invoice via WhatsApp'}
      size="md"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleCopyMessage}
            style={{
              padding: '8px 14px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            📋 {isHi ? 'संदेश कॉपी करें' : 'Copy Message'}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSharePdf}
              disabled={isPdfSharing}
              style={{
                padding: '8px 14px',
                backgroundColor: '#059669',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📄 {isPdfSharing ? '...' : isHi ? 'पीडीएफ शेयर करें' : 'Share PDF'}
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              disabled={isLoading || !phoneValidation.valid}
              style={{
                padding: '8px 18px',
                backgroundColor: '#25d366', // WhatsApp Green
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !phoneValidation.valid ? 'not-allowed' : 'pointer',
                opacity: !phoneValidation.valid ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💬</span>
              <span>{isHi ? 'व्हाट्सएप में खोलें ➔' : 'Open WhatsApp ➔'}</span>
            </button>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280' }}>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔄</div>
          <div>{isHi ? 'बिल विवरण लोड हो रहा है...' : 'Loading invoice share details...'}</div>
        </div>
      ) : error ? (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          ⚠️ {error}
        </div>
      ) : shareDetails ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Invoice Summary Pill */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {isHi ? 'ग्राहक' : 'Customer'}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                {shareDetails.customer.displayName}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                {shareDetails.invoiceNumber}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#2563eb' }}>
                ₹ {shareDetails.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Contact Destination Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              {isHi ? '📱 व्हाट्सएप प्राप्तकर्ता नंबर (Recipient)' : '📱 Recipient WhatsApp Number'}
            </label>

            {shareDetails.customer.contacts.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {shareDetails.customer.contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleContactChange(c.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: selectedContactId === c.id ? '2px solid #2563eb' : '1px solid #d1d5db',
                      backgroundColor: selectedContactId === c.id ? '#eff6ff' : '#ffffff',
                      color: selectedContactId === c.id ? '#1e40af' : '#374151',
                      fontSize: '12px',
                      fontWeight: selectedContactId === c.id ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>{c.isDedicatedWhatsApp ? '🟢 WA' : '📞'}</span>
                    <span>{c.phone}</span>
                    {c.isDedicatedWhatsApp && (
                      <span style={{ fontSize: '10px', backgroundColor: '#dcfce7', color: '#166534', padding: '1px 4px', borderRadius: '4px' }}>
                        WhatsApp
                      </span>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleContactChange('manual')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: selectedContactId === 'manual' ? '2px solid #2563eb' : '1px solid #d1d5db',
                    backgroundColor: selectedContactId === 'manual' ? '#eff6ff' : '#ffffff',
                    color: selectedContactId === 'manual' ? '#1e40af' : '#374151',
                    fontSize: '12px',
                    fontWeight: selectedContactId === 'manual' ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  ✏️ {isHi ? 'अन्य नंबर' : 'Custom Number'}
                </button>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="text"
                value={manualPhoneInput}
                onChange={(e) => setManualPhoneInput(e.target.value)}
                placeholder="e.g. 9876543210 or +919876543210"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: phoneValidation.valid ? '1px solid #10b981' : '1px solid #d1d5db',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              {phoneValidation.valid && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#065f46',
                    backgroundColor: '#d1fae5',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ✓ E.164: {phoneValidation.phoneE164}
                </span>
              )}
            </div>

            {!phoneValidation.valid && manualPhoneInput.trim() && (
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>
                ⚠️ {phoneValidation.error}
              </div>
            )}
          </div>

          {/* Customer Consent & Privacy (FR-COMMS-001 §6.6) */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: activeContact?.whatsappPreference === 'opted_in' ? '#f0fdf4' : '#fffbeb',
              border: activeContact?.whatsappPreference === 'opted_in' ? '1px solid #bbf7d0' : '1px solid #fef3c7',
              fontSize: '12px',
              color: activeContact?.whatsappPreference === 'opted_in' ? '#166534' : '#92400e',
            }}
          >
            {activeContact?.whatsappPreference === 'opted_in' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✓</span>
                <span>
                  {isHi
                    ? 'ग्राहक ने व्हाट्सएप पर बिल प्राप्त करने की सहमति दर्ज कराई है।'
                    : 'Customer has recorded active consent to receive invoices via WhatsApp.'}
                </span>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasConfirmedConsent}
                  onChange={(e) => setHasConfirmedConsent(e.target.checked)}
                />
                <span>
                  {isHi
                    ? 'ग्राहक ने व्हाट्सएप पर यह बिल भेजने का अनुरोध किया है (सहमति की पुष्टि करें)।'
                    : 'Customer requested/agreed to receive this invoice on WhatsApp (confirm consent).'}
                </span>
              </label>
            )}
          </div>

          {/* Editable Message Text Preview (FR-COMMS-001 §5.4) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>
                {isHi ? '📝 संदेश पूर्वावलोकन (Message Preview)' : '📝 Message Preview (Editable)'}
              </label>
              <button
                type="button"
                onClick={() => {
                  const resetMsg = buildInvoiceShareMessage({
                    customerName: shareDetails.customer?.displayName || 'Customer',
                    businessName: shareDetails.businessName || 'vyapaarKhata Store',
                    invoiceNumber: shareDetails.invoiceNumber,
                    invoiceDate: shareDetails.invoiceDate,
                    currencySymbol: shareDetails.currencySymbol || '₹',
                    grandTotal: shareDetails.grandTotal,
                    amountPaid: shareDetails.amountPaid,
                    balanceDue: shareDetails.balanceDue,
                    paymentStatus: shareDetails.paymentStatus,
                    language: language === 'hi' ? 'hi' : 'en',
                  });
                  setMessageText(resetMsg);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 {isHi ? 'रीसेट करें' : 'Reset'}
              </button>
            </div>

            <textarea
              rows={7}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                fontFamily: 'inherit',
                lineHeight: '1.4',
                outline: 'none',
                resize: 'vertical',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Clear Operational Guidance Note */}
          <div
            style={{
              fontSize: '11.5px',
              color: '#64748b',
              backgroundColor: '#f8fafc',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>ℹ️</span>
            <span>
              {isHi
                ? 'व्हाट्सएप खुलने के बाद आपको व्हाट्सएप में "Send" बटन दबाना होगा।'
                : 'Clicking Open WhatsApp launches the chat. You must review and press "Send" inside WhatsApp.'}
            </span>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};
