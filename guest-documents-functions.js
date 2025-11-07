// ============================================
// HOSTIZZY - GUEST DOCUMENTS JAVASCRIPT FUNCTIONS
// Add these functions to your index.html <script> section
// ============================================

// Global state for guest documents
let currentGuestDocuments = [];
let currentFilterStatus = 'all';
let currentDocumentForReview = null;

// ============================================
// LOAD GUEST DOCUMENTS
// ============================================
async function loadGuestDocuments() {
    try {
        showLoading('Loading guest documents...');

        // Fetch all guest documents with reservation info
        const { data: documents, error } = await supabase
            .from('guest_documents')
            .select(`
                *,
                reservations:booking_id (
                    booking_id,
                    property_name,
                    guest_name,
                    guest_phone,
                    guest_email,
                    check_in,
                    check_out
                )
            `)
            .order('submitted_at', { ascending: false });

        if (error) throw error;

        currentGuestDocuments = documents || [];
        renderGuestDocuments();
        updateDocumentStats();
        updateHomeStatDocuments();

        hideLoading();
    } catch (error) {
        hideLoading();
        console.error('Error loading guest documents:', error);
        showToast('Failed to load guest documents', 'error');
    }
}

// ============================================
// RENDER GUEST DOCUMENTS LIST
// ============================================
function renderGuestDocuments() {
    const container = document.getElementById('guestDocumentsList');

    // Filter documents
    let filtered = currentGuestDocuments;
    if (currentFilterStatus !== 'all') {
        filtered = currentGuestDocuments.filter(doc => doc.status === currentFilterStatus);
    }

    // Search filter
    const searchTerm = document.getElementById('guestDocSearch')?.value?.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(doc => {
            return (
                doc.booking_id.toLowerCase().includes(searchTerm) ||
                doc.guest_name.toLowerCase().includes(searchTerm) ||
                (doc.reservations?.guest_phone || '').includes(searchTerm)
            );
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">📋</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No documents found</div>
                <div style="font-size: 14px;">Guest ID submissions will appear here</div>
            </div>
        `;
        return;
    }

    // Group by booking ID
    const groupedByBooking = {};
    filtered.forEach(doc => {
        if (!groupedByBooking[doc.booking_id]) {
            groupedByBooking[doc.booking_id] = [];
        }
        groupedByBooking[doc.booking_id].push(doc);
    });

    let html = '';

    Object.entries(groupedByBooking).forEach(([bookingId, docs]) => {
        const reservation = docs[0].reservations;
        const pendingCount = docs.filter(d => d.status === 'pending').length;
        const verifiedCount = docs.filter(d => d.status === 'verified').length;
        const rejectedCount = docs.filter(d => d.status === 'rejected').length;

        html += `
            <div style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; margin-bottom: 20px; background: white;">
                <!-- Booking Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">
                            ${bookingId}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 14px;">
                            ${reservation?.property_name || 'Unknown Property'}
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">
                            📅 ${reservation ? formatDate(reservation.check_in) : '-'} - ${reservation ? formatDate(reservation.check_out) : '-'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${pendingCount > 0 ? `<span style="background: var(--warning-light); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⏳ ${pendingCount} Pending</span>` : ''}
                        ${verifiedCount > 0 ? `<span style="background: var(--success); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✅ ${verifiedCount} Verified</span>` : ''}
                        ${rejectedCount > 0 ? `<span style="background: var(--danger); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">❌ ${rejectedCount} Rejected</span>` : ''}
                        <button class="btn btn-sm btn-secondary" onclick="sendGuestReminder('${bookingId}', '${reservation?.guest_phone || ''}', '${reservation?.guest_name || ''}')">
                            📱 Send Reminder
                        </button>
                    </div>
                </div>

                <!-- Guest Documents List -->
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px;">
                    ${docs.map(doc => createDocumentCard(doc)).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ============================================
// CREATE DOCUMENT CARD
// ============================================
function createDocumentCard(doc) {
    const statusColors = {
        pending: { bg: '#fef3c7', color: '#92400e', icon: '⏳' },
        verified: { bg: '#d1fae5', color: '#065f46', icon: '✅' },
        rejected: { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
        incomplete: { bg: '#e5e7eb', color: '#374151', icon: '⚠️' }
    };

    const status = statusColors[doc.status] || statusColors.pending;
    const docTypeLabel = (doc.document_type || 'Unknown').replace(/_/g, ' ');

    return `
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 16px; background: var(--background); cursor: pointer; transition: all 0.2s;"
             onclick="openDocumentReview('${doc.id}')"
             onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateY(-2px)'"
             onmouseout="this.style.boxShadow='none'; this.style.transform='translateY(0)'">

            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div style="font-weight: 600; font-size: 14px;">
                    ${doc.guest_type === 'primary' ? '👤 ' : ''}${doc.guest_name}
                </div>
                <span style="background: ${status.bg}; color: ${status.color}; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;">
                    ${status.icon} ${doc.status.toUpperCase()}
                </span>
            </div>

            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 8px;">
                📄 ${docTypeLabel}
            </div>

            <div style="font-size: 12px; color: var(--text-tertiary);">
                Submitted: ${formatDateTime(doc.submitted_at)}
            </div>

            ${doc.verified_at ? `
                <div style="font-size: 12px; color: var(--success); margin-top: 4px;">
                    ✓ Verified by ${doc.verified_by || 'Staff'}
                </div>
            ` : ''}

            ${doc.rejection_reason ? `
                <div style="font-size: 12px; color: var(--danger); margin-top: 4px;">
                    Reason: ${doc.rejection_reason}
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// FILTER GUEST DOCUMENTS
// ============================================
function filterGuestDocuments(status) {
    currentFilterStatus = status;

    // Update UI
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    document.querySelector(`.filter-chip[data-status="${status}"]`)?.classList.add('active');

    renderGuestDocuments();
}

// ============================================
// SEARCH GUEST DOCUMENTS
// ============================================
function searchGuestDocuments(term) {
    renderGuestDocuments();
}

// ============================================
// UPDATE DOCUMENT STATS
// ============================================
function updateDocumentStats() {
    const pending = currentGuestDocuments.filter(d => d.status === 'pending').length;
    const verified = currentGuestDocuments.filter(d => d.status === 'verified').length;
    const rejected = currentGuestDocuments.filter(d => d.status === 'rejected').length;
    const incomplete = currentGuestDocuments.filter(d => d.status === 'incomplete').length;

    document.getElementById('docStatPending').textContent = pending;
    document.getElementById('docStatVerified').textContent = verified;
    document.getElementById('docStatRejected').textContent = rejected;
    document.getElementById('docStatIncomplete').textContent = incomplete;
}

// ============================================
// UPDATE HOME STAT (Pending Documents)
// ============================================
function updateHomeStatDocuments() {
    const pending = currentGuestDocuments.filter(d => d.status === 'pending').length;
    const element = document.getElementById('homeStatDocuments');
    if (element) {
        element.textContent = pending;
    }
}

// ============================================
// REFRESH GUEST DOCUMENTS
// ============================================
async function refreshGuestDocuments() {
    await loadGuestDocuments();
    showToast('Documents refreshed', 'success');
}

// ============================================
// OPEN DOCUMENT REVIEW MODAL
// ============================================
async function openDocumentReview(documentId) {
    try {
        showLoading('Loading document...');

        const { data: doc, error } = await supabase
            .from('guest_documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error) throw error;

        currentDocumentForReview = doc;

        // Populate modal
        document.getElementById('modalGuestName').textContent = doc.guest_name;
        document.getElementById('modalBookingId').textContent = doc.booking_id;
        document.getElementById('modalDocType').textContent = (doc.document_type || 'Unknown').replace(/_/g, ' ');
        document.getElementById('modalDocNumber').textContent = doc.document_number || 'N/A';
        document.getElementById('modalSubmittedAt').textContent = formatDateTime(doc.submitted_at);
        document.getElementById('modalStatus').textContent = doc.status.toUpperCase();
        document.getElementById('modalStaffNotes').value = doc.staff_notes || '';

        // Load images
        await loadDocumentImages(doc);

        // Show/hide elements based on status
        if (doc.status === 'verified') {
            document.getElementById('modalActions').style.display = 'none';
            document.getElementById('rejectFormSection').style.display = 'none';
            document.getElementById('verifiedMessage').style.display = 'block';
            document.getElementById('verifiedBy').textContent = doc.verified_by || 'Staff';
            document.getElementById('verifiedAt').textContent = formatDateTime(doc.verified_at);
        } else {
            document.getElementById('modalActions').style.display = 'flex';
            document.getElementById('rejectFormSection').style.display = 'none';
            document.getElementById('verifiedMessage').style.display = 'none';
        }

        // Show rejection reason if rejected
        if (doc.status === 'rejected' && doc.rejection_reason) {
            document.getElementById('rejectionReasonSection').style.display = 'block';
            document.getElementById('rejectionReasonText').textContent = doc.rejection_reason;
        } else {
            document.getElementById('rejectionReasonSection').style.display = 'none';
        }

        document.getElementById('guestDocumentModal').style.display = 'flex';
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Error opening document review:', error);
        showToast('Failed to load document', 'error');
    }
}

// ============================================
// LOAD DOCUMENT IMAGES
// ============================================
async function loadDocumentImages(doc) {
    const frontImg = document.getElementById('modalFrontImage');
    const backImg = document.getElementById('modalBackImage');
    const selfieImg = document.getElementById('modalSelfieImage');

    const frontContainer = document.getElementById('modalFrontImageContainer');
    const backContainer = document.getElementById('modalBackImageContainer');
    const selfieContainer = document.getElementById('modalSelfieContainer');

    // Load front image
    if (doc.document_front_url) {
        const { data } = await supabase.storage
            .from('guest-id-documents')
            .createSignedUrl(doc.document_front_url, 3600);

        if (data?.signedUrl) {
            frontImg.src = data.signedUrl;
            frontContainer.style.display = 'block';
        }
    } else {
        frontContainer.style.display = 'none';
    }

    // Load back image
    if (doc.document_back_url) {
        const { data } = await supabase.storage
            .from('guest-id-documents')
            .createSignedUrl(doc.document_back_url, 3600);

        if (data?.signedUrl) {
            backImg.src = data.signedUrl;
            backContainer.style.display = 'block';
        }
    } else {
        backContainer.style.display = 'none';
    }

    // Load selfie
    if (doc.selfie_url) {
        const { data } = await supabase.storage
            .from('guest-id-documents')
            .createSignedUrl(doc.selfie_url, 3600);

        if (data?.signedUrl) {
            selfieImg.src = data.signedUrl;
            selfieContainer.style.display = 'block';
        }
    } else {
        selfieContainer.style.display = 'none';
    }
}

// ============================================
// CLOSE DOCUMENT REVIEW MODAL
// ============================================
function closeGuestDocumentModal() {
    document.getElementById('guestDocumentModal').style.display = 'none';
    currentDocumentForReview = null;
}

// ============================================
// APPROVE DOCUMENT
// ============================================
async function approveDocument() {
    if (!currentDocumentForReview) return;

    try {
        showLoading('Approving document...');

        const notes = document.getElementById('modalStaffNotes').value;

        const { error } = await supabase
            .from('guest_documents')
            .update({
                status: 'verified',
                verified_by: currentUser.email,
                verified_at: new Date().toISOString(),
                staff_notes: notes
            })
            .eq('id', currentDocumentForReview.id);

        if (error) throw error;

        showToast('Document approved successfully', 'success');
        closeGuestDocumentModal();
        await loadGuestDocuments();

        // TODO: Send email notification to guest
        // sendDocumentVerificationEmail(currentDocumentForReview.booking_id);

    } catch (error) {
        hideLoading();
        console.error('Error approving document:', error);
        showToast('Failed to approve document', 'error');
    }
}

// ============================================
// SHOW REJECT FORM
// ============================================
function showRejectForm() {
    document.getElementById('modalActions').style.display = 'none';
    document.getElementById('rejectFormSection').style.display = 'block';
}

// ============================================
// HIDE REJECT FORM
// ============================================
function hideRejectForm() {
    document.getElementById('modalActions').style.display = 'flex';
    document.getElementById('rejectFormSection').style.display = 'none';
}

// ============================================
// REJECT DOCUMENT
// ============================================
async function rejectDocument() {
    if (!currentDocumentForReview) return;

    const reason = document.getElementById('modalRejectionReason').value;
    const notes = document.getElementById('modalStaffNotes').value;

    if (!reason) {
        showToast('Please select a rejection reason', 'error');
        return;
    }

    try {
        showLoading('Rejecting document...');

        const { error } = await supabase
            .from('guest_documents')
            .update({
                status: 'rejected',
                rejection_reason: reason,
                verified_by: currentUser.email,
                verified_at: new Date().toISOString(),
                staff_notes: notes
            })
            .eq('id', currentDocumentForReview.id);

        if (error) throw error;

        showToast('Document rejected', 'success');
        closeGuestDocumentModal();
        await loadGuestDocuments();

        // TODO: Send email notification to guest
        // sendDocumentRejectionEmail(currentDocumentForReview.booking_id, reason);

    } catch (error) {
        hideLoading();
        console.error('Error rejecting document:', error);
        showToast('Failed to reject document', 'error');
    }
}

// ============================================
// FULLSCREEN IMAGE VIEWER
// ============================================
function openImageFullscreen(src) {
    document.getElementById('fullscreenImage').src = src;
    document.getElementById('fullscreenImageModal').style.display = 'flex';
}

function closeFullscreenImage() {
    document.getElementById('fullscreenImageModal').style.display = 'none';
}

// ============================================
// COPY GUEST PORTAL LINK
// ============================================
function copyGuestPortalLink() {
    // Change this URL to your actual guest portal domain
    const portalUrl = window.location.origin + '/guest-portal.html';

    navigator.clipboard.writeText(portalUrl).then(() => {
        showToast('Guest portal link copied to clipboard', 'success');
    }).catch(() => {
        showToast('Failed to copy link', 'error');
    });
}

// ============================================
// SEND GUEST REMINDER (WhatsApp)
// ============================================
function sendGuestReminder(bookingId, phone, guestName) {
    const portalUrl = window.location.origin + '/guest-portal.html?booking=' + bookingId;
    const message = `Hello ${guestName}! Please submit your ID documents for booking ${bookingId} using this link: ${portalUrl}`;

    // Format phone number for WhatsApp
    const formattedPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
}

// ============================================
// HELPER: FORMAT DATE
// ============================================
function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// ============================================
// HELPER: FORMAT DATE TIME
// ============================================
function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================
// INITIALIZATION
// ============================================

// Add this to your existing showView function
// When showing guestDocumentsView, call loadGuestDocuments()

// Example:
/*
function showView(viewName) {
    // ... existing code ...

    if (viewName === 'guestDocuments') {
        loadGuestDocuments();
    }

    // ... rest of code ...
}
*/

// Also update your home stats loading function
// to include updateHomeStatDocuments()

console.log('Guest Documents functions loaded');
