        // Supabase Configuration
        const SUPABASE_URL = 'https://dxthxsguqrxpurorpokq.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dGh4c2d1cXJ4cHVyb3Jwb2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjc4MTMsImV4cCI6MjA3NTYwMzgxM30.JhGzqUolA-A_fGha-0DhHVl7p1vRq4CZcp5ttdVxjQg';
        const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Booking Type Constants
        const BOOKING_TYPES = {
            'STAYCATION': { label: 'Staycation', icon: '🏖️' },
            'WEDDING': { label: 'Wedding', icon: '💒' },
            'BIRTHDAY': { label: 'Birthday Party', icon: '🎂' },
            'CORPORATE_EVENT': { label: 'Corporate Event', icon: '🏢' },
            'CORPORATE_STAY': { label: 'Corporate Stay', icon: '💼' },
            'SHOOT': { label: 'Shoot', icon: '📸' }
        };

        // Target occupancy nights per property per year
        const TARGET_OCCUPANCY_NIGHTS = 200;

        // Global State
        let allReservations = [];
        let allPayments = [];
        let selectedReservations = new Set();
        let currentUser = null;
        let currentWhatsAppBooking = null;

        // WhatsApp Message Templates
        const whatsappTemplates = {
            booking_confirmation: (booking) => `🏠 *Booking Confirmation - ResIQ by Hostizzy*

    Hi ${booking.guest_name}! 👋

    Your booking is *CONFIRMED* ✅

    📋 *Booking Details:*
    🆔 Booking ID: *${booking.booking_id}*
    🏡 Property: *${booking.property_name}*
    📅 Check-in: *${formatDate(booking.check_in)}*
    📅 Check-out: *${formatDate(booking.check_out)}*
    🛏️ Nights: *${booking.nights}*
    👥 Guests: *${booking.number_of_guests}*

    💰 *Payment Summary:*
    Total Amount: ₹${Math.round(booking.total_amount).toLocaleString('en-IN')}
    Paid: ₹${Math.round(booking.paid_amount || 0).toLocaleString('en-IN')}
    ${(booking.paid_amount || 0) < booking.total_amount ? 
    `Balance Due: ₹${Math.round(booking.total_amount - (booking.paid_amount || 0)).toLocaleString('en-IN')}` : 
    'Fully Paid ✅'}

    📍 Property address & directions will be shared 24 hours before check-in.

    For any queries, reply here or call us! 📞

    Thank you for choosing Hostizzy! 🙏
    _Powered by ResIQ_`,

                payment_reminder: (booking) => `💰 *Payment Reminder*

    Hi ${booking.guest_name},

    This is a friendly reminder for your upcoming booking:

    🆔 Booking ID: *${booking.booking_id}*
    🏡 Property: *${booking.property_name}*
    📅 Check-in: *${formatDate(booking.check_in)}*

    💳 *Payment Details:*
    Total Amount: ₹${Math.round(booking.total_amount).toLocaleString('en-IN')}
    Already Paid: ₹${Math.round(booking.paid_amount || 0).toLocaleString('en-IN')}
    *Pending Balance: ₹${Math.round(booking.total_amount - (booking.paid_amount || 0)).toLocaleString('en-IN')}*

    Please complete the payment at your earliest convenience.

    🏦 *Payment Options:*
    - UPI: hostizzy@paytm
    - Bank Transfer
    - Cash on arrival

    Reply with payment confirmation! ✅

    Thank you! 🙏`,

                check_in_instructions: (booking) => `🏠 *Check-in Instructions*

    Hi ${booking.guest_name}! 👋

    Your check-in is scheduled for *${formatDate(booking.check_in)}*

    📍 *Property:*
    ${booking.property_name}

    🔑 *Check-in Process:*
    ⏰ Check-in time: 2:00 PM
    📞 Call our property manager 30 mins before arrival
    🚗 Parking: Available on premises

    🏠 *Property Manager Contact:*
    We'll share contact details closer to check-in date.

    Have a wonderful stay! 🌟

    Need any help? Just reply to this message! 📱`,

                thank_you: (booking) => `🙏 *Thank You for Staying with Us!*

    Hi ${booking.guest_name},

    Thank you for choosing *${booking.property_name}* for your stay! 

    We hope you had a wonderful experience! ⭐

    📝 *We'd love your feedback:*
    Your review helps us improve and helps other guests make informed decisions.

    🎁 *Special Offer:*
    Book your next stay with us and get 10% OFF! 
    Use code: *RETURNGUEST10*

    Looking forward to hosting you again! 🏠

    Warm regards,
    Team Hostizzy 💚`,

                custom: (booking) => `Hi ${booking.guest_name},

    [Type your message here]

    Booking ID: ${booking.booking_id}
    Property: ${booking.property_name}

    Team Hostizzy 🏠`
            };
        let offlineDB = null;
        let isOnline = navigator.onLine;
        let syncInProgress = false;
        // Global state for home screen
        const state = {
            reservations: [],
            properties: [],
            payments: []
        };

        // IndexedDB Setup
        const DB_NAME = 'HostizzyOfflineDB';
        const DB_VERSION = 1;
        
        async function initOfflineDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onerror = () => reject(request.error);
                
                request.onsuccess = () => {
                    offlineDB = request.result;
                    console.log('IndexedDB initialized');
                    resolve(offlineDB);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    if (!db.objectStoreNames.contains('pendingReservations')) {
                        const reservationStore = db.createObjectStore('pendingReservations', { keyPath: 'tempId' });
                        reservationStore.createIndex('timestamp', 'timestamp', { unique: false });
                        reservationStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('pendingPayments')) {
                        const paymentStore = db.createObjectStore('pendingPayments', { keyPath: 'tempId' });
                        paymentStore.createIndex('timestamp', 'timestamp', { unique: false });
                        paymentStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    }
                    
                    if (!db.objectStoreNames.contains('pendingEdits')) {
                        const editStore = db.createObjectStore('pendingEdits', { keyPath: 'tempId' });
                        editStore.createIndex('timestamp', 'timestamp', { unique: false });
                        editStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                    }
                };
            });
        }

        async function saveToOfflineDB(storeName, data) {
            if (!offlineDB) await initOfflineDB();
            
            return new Promise((resolve, reject) => {
                const transaction = offlineDB.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                
                const item = {
                    ...data,
                    tempId: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    timestamp: Date.now(),
                    syncStatus: 'pending'
                };
                
                const request = store.add(item);
                request.onsuccess = () => resolve(item);
                request.onerror = () => reject(request.error);
            });
        }

        async function getAllFromOfflineDB(storeName, status = null) {
            if (!offlineDB) await initOfflineDB();
            
            return new Promise((resolve, reject) => {
                const transaction = offlineDB.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                
                let request;
                if (status) {
                    const index = store.index('syncStatus');
                    request = index.getAll(status);
                } else {
                    request = store.getAll();
                }
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        }

        async function deleteFromOfflineDB(storeName, tempId) {
            if (!offlineDB) await initOfflineDB();
            
            return new Promise((resolve, reject) => {
                const transaction = offlineDB.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(tempId);
                
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        async function countPendingItems() {
            const stores = ['pendingReservations', 'pendingPayments', 'pendingEdits'];
            let total = 0;
            
            for (const store of stores) {
                const items = await getAllFromOfflineDB(store, 'pending');
                total += items.length;
            }
            
            return total;
        }
        // ============================================
        // SMART NUMBER FORMATTING
        // ============================================
        
        function formatCurrency(amount, options = {}) {
            const {
                showSymbol = true,
                showDecimals = false,
                compact = true
            } = options;
            
            const value = parseFloat(amount) || 0;
            const absValue = Math.abs(value);
            
            let formatted = '';
            
            if (compact) {
                if (absValue >= 10000000) {
                    // Crores (10M+)
                    formatted = `${(value / 10000000).toFixed(showDecimals ? 2 : 1)}Cr`;
                } else if (absValue >= 100000) {
                    // Lakhs (100K+) - Only use lakhs for 1L and above
                    formatted = `${(value / 100000).toFixed(showDecimals ? 2 : 1)}L`;
                } else if (absValue >= 1000) {
                    // Thousands (1K+) - Use for amounts below 1 lakh
                    formatted = `${(value / 1000).toFixed(showDecimals ? 2 : 1)}K`;
                } else {
                    // Less than 1000
                    formatted = Math.round(value).toLocaleString('en-IN');
                }
            } else {
                formatted = Math.round(value).toLocaleString('en-IN');
            }
            
            return showSymbol ? `₹${formatted}` : formatted;
        }

        // Booking Source Badge Helper
        function getBookingSourceBadge(source) {
            if (!source) return '<span style="color: var(--text-secondary); font-size: 12px;">N/A</span>';
            
            const badges = {
                'DIRECT': { emoji: '🟢', color: '#10b981', label: 'Direct' },
                'AIRBNB': { emoji: '🔵', color: '#2563eb', label: 'Airbnb' },
                'AGODA/BOOKING.COM': { emoji: '🟡', color: '#f59e0b', label: 'Agoda/Booking' },
                'MMT/GOIBIBO': { emoji: '🟠', color: '#f97316', label: 'MMT/Goibibo' },
                'OTHER': { emoji: '⚪', color: '#64748b', label: 'Other' }
            };
            
            const badge = badges[source] || badges['OTHER'];
            
            return `
                <span style="
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 8px;
                    background: ${badge.color}15;
                    color: ${badge.color};
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    white-space: nowrap;
                ">
                    ${badge.emoji} ${badge.label}
                </span>
            `;
        }
        
        // Toast Notifications
        function showToast(title, message, icon = '🔔') {
            // Haptic feedback based on icon
            if (icon === '✅') haptic('success');
            else if (icon === '❌') haptic('error');
            else if (icon === '⚠️') haptic('warning');
            else haptic('light');
            const toast = document.getElementById('notificationToast');
            document.getElementById('toastIcon').textContent = icon;
            document.getElementById('toastTitle').textContent = title;
            document.getElementById('toastMessage').textContent = message;
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 5000);
        }

        function hideToast() {
            document.getElementById('notificationToast').classList.remove('show');
        }

        // Sync Status Management
        function updateSyncIndicator() {
            const indicator = document.getElementById('syncIndicator');
            const dot = indicator.querySelector('.sync-dot');
            const status = document.getElementById('syncStatus');
            const syncBtn = document.getElementById('manualSyncBtn');
            const banner = document.getElementById('offlineBanner');
            
            if (syncInProgress) {
                indicator.className = 'sync-indicator syncing';
                dot.className = 'sync-dot syncing';
                status.textContent = 'Syncing...';
                syncBtn.style.display = 'none';
                banner.classList.remove('show');
            } else if (isOnline) {
                indicator.className = 'sync-indicator online';
                dot.className = 'sync-dot online';
                status.textContent = 'Online';
                syncBtn.style.display = 'none';
                banner.classList.remove('show');
            } else {
                indicator.className = 'sync-indicator offline';
                dot.className = 'sync-dot offline';
                status.textContent = 'Offline';
                syncBtn.style.display = 'inline-block';
                banner.classList.add('show');
            }
            
            updatePendingCount();
        }

        async function updatePendingCount() {
            try {
                const count = await countPendingItems();
                const badge = document.getElementById('pendingCount');
                
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            } catch (error) {
                console.error('Error counting pending items:', error);
            }
        }

        // Online/Offline Detection
        window.addEventListener('online', () => {
            console.log('Network: Online');
            isOnline = true;
            updateSyncIndicator();
            showToast('Connection Restored', 'You are back online. Syncing data...', '✅');
            setTimeout(() => autoSync(), 1000);
        });
        
        window.addEventListener('offline', () => {
            console.log('Network: Offline');
            isOnline = false;
            updateSyncIndicator();
            showToast('No Connection', 'You are offline. Changes will be saved locally.', '⚠️');
        });

        async function autoSync() {
            if (syncInProgress || !isOnline) return;
            
            try {
                const pendingCount = await countPendingItems();
                if (pendingCount === 0) return;
                
                console.log(`Auto-syncing ${pendingCount} pending items...`);
                await syncAllPendingData();
            } catch (error) {
                console.error('Auto-sync error:', error);
            }
        }

        async function manualSync() {
            if (syncInProgress) return;
            if (!isOnline) {
                showToast('Cannot Sync', 'You are offline', '❌');
                return;
            }
            
            try {
                const pendingCount = await countPendingItems();
                if (pendingCount === 0) {
                    showToast('Nothing to Sync', 'All data is up to date', 'ℹ️');
                    return;
                }
                
                await syncAllPendingData();
            } catch (error) {
                console.error('Manual sync error:', error);
                showToast('Sync Failed', error.message, '❌');
            }
        }

        async function syncAllPendingData() {
            if (syncInProgress) return;
            
            syncInProgress = true;
            updateSyncIndicator();
            
            let successCount = 0;
            let failCount = 0;
            
            try {
                // Sync reservations
                const pendingReservations = await getAllFromOfflineDB('pendingReservations', 'pending');
                for (const item of pendingReservations) {
                    try {
                        await syncReservation(item);
                        successCount++;
                    } catch (error) {
                        console.error('Failed to sync reservation:', error);
                        failCount++;
                    }
                }
                
                // Sync payments
                const pendingPayments = await getAllFromOfflineDB('pendingPayments', 'pending');
                for (const item of pendingPayments) {
                    try {
                        await syncPayment(item);
                        successCount++;
                    } catch (error) {
                        console.error('Failed to sync payment:', error);
                        failCount++;
                    }
                }
                
                // Sync edits
                const pendingEdits = await getAllFromOfflineDB('pendingEdits', 'pending');
                for (const item of pendingEdits) {
                    try {
                        await syncEdit(item);
                        successCount++;
                    } catch (error) {
                        console.error('Failed to sync edit:', error);
                        failCount++;
                    }
                }
                
                if (failCount === 0) {
                    showToast('Sync Complete', `Successfully synced ${successCount} items`, '✅');
                } else {
                    showToast('Partial Sync', `Synced ${successCount}, ${failCount} failed`, '⚠️');
                }
                
                await loadReservations();
                await loadPayments();
                await loadDashboard();
                
            } catch (error) {
                console.error('Sync error:', error);
                showToast('Sync Failed', error.message, '❌');
            } finally {
                syncInProgress = false;
                updateSyncIndicator();
            }
        }

        async function syncReservation(item) {
            const { tempId, timestamp, syncStatus, ...reservationData } = item;
            const result = await db.saveReservation(reservationData);
            await deleteFromOfflineDB('pendingReservations', tempId);
        }

        async function syncPayment(item) {
            const { tempId, timestamp, syncStatus, ...paymentData } = item;
            const result = await db.savePayment(paymentData);
            await recalculatePaymentStatus(paymentData.booking_id);
            await deleteFromOfflineDB('pendingPayments', tempId);
        }

        async function syncEdit(item) {
            const { tempId, timestamp, syncStatus, booking_id, updates, table } = item;
            
            const { error } = await supabase
                .from(table)
                .update(updates)
                .eq('booking_id', booking_id);
            
            if (error) throw error;
            await deleteFromOfflineDB('pendingEdits', tempId);
        }

        // Database Helper
        const db = {
            async getTeamMembers() {
                const { data, error } = await supabase.from('team_members').select('*');
                if (error) throw error;
                return data || [];
            },
            async getProperties() {
                const { data, error } = await supabase.from('properties').select('*').order('name');
                if (error) throw error;
                return data || [];
            },
            async getReservations() {
                const { data, error } = await supabase.from('reservations').select('*').order('check_in', { ascending: false });
                if (error) throw error;
                return data || [];
            },
            async getReservation(bookingId) {
                const { data, error } = await supabase.from('reservations').select('*').eq('booking_id', bookingId).single();
                if (error) throw error;
                return data;
            },
            async getRevenueSharePercent(propertyId) {
                const { data, error } = await supabase
                .from('properties')
                .select('revenue_share_percent')
                .eq('id', propertyId)
                .single();
            return data?.revenue_share_percent || 20; // Default 20% if not set
            },

            async saveReservation(reservation) {
                if (reservation.id) {
                    const { data, error } = await supabase
                        .from('reservations')
                        .update(reservation)
                        .eq('id', reservation.id)
                        .select();
                    if (error) {
                        console.error('Update error:', error);
                        throw error;
                    }
                    return data?.[0];
                } else {
                    const { id, ...cleanReservation } = reservation;
                    const { data, error } = await supabase
                        .from('reservations')
                        .insert([cleanReservation])
                        .select();
                    if (error) {
                        console.error('Insert error:', error);
                        throw error;
                    }
                    return data?.[0];
                }
            },
            async deleteReservation(bookingId) {
                const { error } = await supabase.from('reservations').delete().eq('booking_id', bookingId);
                if (error) throw error;
            },
            async getPayments(bookingId) {
                const { data, error } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .order('payment_date', { ascending: false });
                if (error) throw error;
                return data || [];
            },
            async getAllPayments() {
                const { data, error } = await supabase
                    .from('payments')
                    .select('*')
                    .order('payment_date', { ascending: false });
                if (error) throw error;
                return data || [];
            },
            async savePayment(payment) {
                const { data, error } = await supabase
                    .from('payments')
                    .insert([payment])
                    .select();
                if (error) throw error;
                return data?.[0];
            },
            async updatePayment(id, payment) {
                const { data, error } = await supabase
                    .from('payments')
                    .update(payment)
                    .eq('id', id)
                    .select();
                if (error) throw error;
                return data?.[0];
            },
            async deletePayment(id) {
                const { error } = await supabase.from('payments').delete().eq('id', id);
                if (error) throw error;
            },
            async saveProperty(property) {
                if (property.id) {
                    const { data, error } = await supabase.from('properties').update(property).eq('id', property.id).select();
                    if (error) throw error;
                    return data?.[0];
                } else {
                    const { data, error } = await supabase.from('properties').insert([property]).select();
                    if (error) throw error;
                    return data?.[0];
                }
            },
            async deleteProperty(id) {
                const { error } = await supabase.from('properties').delete().eq('id', id);
                if (error) throw error;
            },
            async saveTeamMember(member) {
                if (member.id) {
                    const { data, error } = await supabase.from('team_members').update(member).eq('id', member.id).select();
                    if (error) throw error;
                    return data?.[0];
                } else {
                    const { data, error } = await supabase.from('team_members').insert([member]).select();
                    if (error) throw error;
                    return data?.[0];
                }
            },
            async deleteTeamMember(id) {
                const { error} = await supabase.from('team_members').delete().eq('id', id);
                if (error) throw error;
            },
            async bulkUpdateReservations(bookingIds, updates) {
                const { error } = await supabase
                    .from('reservations')
                    .update(updates)
                    .in('booking_id', bookingIds);
                if (error) throw error;
            }
        };

        // Authentication
        async function login() {
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!email || !password) {
                showToast('Login Error', 'Please enter email and password', '❌');
                return;
            }
            
            try {
                const users = await db.getTeamMembers();
                const user = users.find(u => u.email === email && u.password === password);
                
                if (user) {
                    if (!user.is_active) {
                        showToast('Account Inactive', 'Your account has been deactivated', '❌');
                        return;
                    }
                    
                    currentUser = user;
                    
                    // Store in localStorage for persistence
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    
                   // User context set via RLS policies (custom auth)
                    
                    document.getElementById('loginScreen').classList.add('hidden');
                    document.getElementById('mainApp').classList.remove('hidden');
                    // Update email in both navbar and dropdown
                    updateUserEmailDisplay(currentUser.email);
                    document.querySelector('.mobile-nav').classList.remove('hidden');
                    document.getElementById('mobileHeader').classList.remove('hidden');
                    document.getElementById('mobileUserEmail').textContent = user.email;
                    document.getElementById('sidebarUserEmail').textContent = user.email;
                    
                    // Hide Performance view for staff
                    if (user.role === 'staff') {
                        hidePerformanceForStaff();
                    }
                    
                    // Load initial data first
                    await loadDashboard();
                    showToast('Welcome!', `Logged in as ${user.name}`, '👋');

                    // Show appropriate view
                    const lastView = localStorage.getItem('lastView') || 'home';
                    showView(lastView);
                    
                    // Update home stats if needed
                    if (lastView === 'home') {
                        setTimeout(() => updateHomeScreenStats(), 500);
                    }
                } else {
                    showToast('Login Failed', 'Invalid credentials', '❌');
                }
            } catch (error) {
                console.error('Login error:', error);
                showToast('Login Error', error.message, '❌');
            }
        }

        function hidePerformanceForStaff() {
            // Hide from desktop navigation
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.textContent.includes('Performance') || link.onclick?.toString().includes('performance')) {
                    link.style.display = 'none';
                }
            });
            
            // Hide from mobile navigation
            document.querySelectorAll('.mobile-nav-item').forEach(link => {
                if (link.textContent.includes('Performance') || link.onclick?.toString().includes('performance')) {
                    link.style.display = 'none';
                }
            });
            
            // Hide from mobile sidebar
            document.querySelectorAll('.mobile-sidebar-link').forEach(link => {
                if (link.textContent.includes('Performance') || link.onclick?.toString().includes('performance')) {
                    link.style.display = 'none';
                }
            });
        }

        function logout() {
            localStorage.removeItem('currentUser');
            currentUser = null;
            document.getElementById('mainApp').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
            showToast('Logged Out', 'See you soon!', '👋');
        }

        // Mobile Navigation
        function toggleMobileSidebar() {
            const sidebar = document.getElementById('mobileSidebar');
            const overlay = document.getElementById('mobileOverlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        function showViewMobile(viewName) {
            showView(viewName);
            toggleMobileSidebar();
            
            document.querySelectorAll('.mobile-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll('.mobile-sidebar-link').forEach(item => {
                item.classList.remove('active');
            });
            if (event && event.target) event.target.classList.add('active');
        }

        function navigateToReservation(booking_id) {
            // Switch to reservations view
            showView('reservations');
            
            // Wait for view to load, then search for the booking
            setTimeout(() => {
                const searchInput = document.getElementById('searchReservations');
                searchInput.value = booking_id;
                filterReservations();
                
                // Show toast notification
                showToast('Navigation', `Showing reservation: ${booking_id}`, '🔍');
            }, 300);
        }

        /**
         * Load initial data in background without blocking UI
         */
        async function loadInitialData() {
            try {
                // Load data asynchronously without blocking
                const [reservations, properties, payments] = await Promise.all([
                    db.getReservations(),
                    db.getProperties(),
                    db.getAllPayments()
                ]);
                
                // Update global state
                state.reservations = reservations;
                state.properties = properties;
                state.payments = payments;
                allReservations = reservations;
                allPayments = payments;
                
                console.log('Initial data loaded:', {
                    reservations: reservations.length,
                    properties: properties.length,
                    payments: payments.length
                });
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        }

        /**
         * Update greeting based on time of day
         */
        function updateGreeting() {
            const hour = new Date().getHours();
            const greetingTimeEl = document.getElementById('greetingTime');
            const greetingUserEl = document.getElementById('greetingUser');
            
            let greeting = 'Good Evening';
            let emoji = '🌙';
            
            if (hour < 12) {
                greeting = 'Good Morning';
                emoji = '☀️';
            } else if (hour < 17) {
                greeting = 'Good Afternoon';
                emoji = '🌤️';
            }
            
            greetingTimeEl.textContent = `${emoji} ${greeting}`;
            
            if (currentUser && currentUser.email) {
                const userName = currentUser.email.split('@')[0];
                greetingUserEl.textContent = `Welcome, ${userName}!`;
            }
        }

        /**
         * Update home screen statistics
         */
        async function updateHomeScreenStats() {
            try {
                // Update greeting
                updateGreeting();
                
                // Ensure we have data
                if (!state.reservations || state.reservations.length === 0) {
                    // Load data if not available
                    state.reservations = await db.getReservations();
                    state.properties = await db.getProperties();
                    state.payments = await db.getAllPayments();
                }
                
                // Calculate stats
                const totalReservations = state.reservations.length;
                const activeReservations = state.reservations.filter(r => r.status === 'confirmed' || r.status === 'checked_in').length;
                const upcomingReservations = state.reservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    const today = new Date();
                    return checkIn > today && r.status === 'confirmed';
                }).length;
                
                const pendingPayments = state.reservations.filter(r => 
                    r.payment_status === 'pending' || r.payment_status === 'partial'
                ).length;
                
                const totalProperties = state.properties ? state.properties.length : 0;
                
                // Calculate this month's revenue
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const thisMonthRevenue = state.reservations
                    .filter(r => new Date(r.created_at) >= firstDay)
                    .reduce((sum, r) => sum + (parseFloat(r.paid_amount) || 0), 0);
                
                // Update UI - with safe checks
                const homeStatReservations = document.getElementById('homeStatReservations');
                const homeStatActive = document.getElementById('homeStatActive');
                const homeStatPending = document.getElementById('homeStatPending');
                const homeStatUpcoming = document.getElementById('homeStatUpcoming');
                const homeStatProperties = document.getElementById('homeStatProperties');
                const homeStatGuests = document.getElementById('homeStatGuests');
                const homeStatRevenue = document.getElementById('homeStatRevenue');
                
                if (homeStatReservations) homeStatReservations.textContent = totalReservations;
                if (homeStatActive) homeStatActive.textContent = activeReservations;
                if (homeStatPending) homeStatPending.textContent = pendingPayments;
                if (homeStatUpcoming) homeStatUpcoming.textContent = upcomingReservations;
                if (homeStatProperties) homeStatProperties.textContent = totalProperties;
                if (homeStatGuests) homeStatGuests.textContent = calculateUniqueGuests(allReservations);
                if (homeStatRevenue) homeStatRevenue.textContent = '₹' + Math.round(thisMonthRevenue / 1000) + 'K';
                
                // Update recent activity
                updateRecentActivity();
                
            } catch (error) {
                console.error('Error updating home screen:', error);
                // Set default values on error
                const homeStatReservations = document.getElementById('homeStatReservations');
                const homeStatActive = document.getElementById('homeStatActive');
                const homeStatPending = document.getElementById('homeStatPending');
                const homeStatUpcoming = document.getElementById('homeStatUpcoming');
                const homeStatProperties = document.getElementById('homeStatProperties');
                const homeStatGuests = document.getElementById('homeStatGuests');
                const homeStatRevenue = document.getElementById('homeStatRevenue');
                
                if (homeStatReservations) homeStatReservations.textContent = '0';
                if (homeStatActive) homeStatActive.textContent = '0';
                if (homeStatPending) homeStatPending.textContent = '0';
                if (homeStatUpcoming) homeStatUpcoming.textContent = '0';
                if (homeStatProperties) homeStatProperties.textContent = '0';
                if (homeStatGuests) homeStatGuests.textContent = '0';
                if (homeStatRevenue) homeStatRevenue.textContent = '₹0';
            }
        }

        /**
         * Update recent activity feed
         */
        function updateRecentActivity() {
            const activityList = document.getElementById('recentActivityList');
            
            // Get recent reservations (last 5)
            const recentReservations = (state.reservations || [])
                .slice() // copy before sort
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
            
            if (recentReservations.length === 0) {
                activityList.innerHTML = '<div style="color: #94a3b8; font-style: italic;">No recent activity</div>';
                return;
            }
            
            let html = '<div style="display: flex; flex-direction: column; gap: 12px;">';
            
            recentReservations.forEach(r => {
                const timeAgo = getTimeAgo(new Date(r.created_at));
                const statusColor = r.payment_status === 'paid' ? '#10b981' : '#f59e0b';
                const statusIcon = r.payment_status === 'paid' ? '✅' : '⏳';
                
                html += `
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 12px;
                        background: #f8fafc;
                        border-radius: 8px;
                        cursor: pointer;
                    " onclick="showView('reservations')">
                        <div style="font-size: 24px;">${statusIcon}</div>
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #0f172a; margin-bottom: 2px;">
                                ${r.guest_name}
                            </div>
                            <div style="font-size: 12px; color: #64748b;">
                                ${r.property_name} • ${timeAgo}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 600; color: ${statusColor};">
                                ₹${Math.round(r.total_amount).toLocaleString('en-IN')}
                            </div>
                            <div style="font-size: 11px; color: #64748b; text-transform: capitalize;">
                                ${r.payment_status}
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            activityList.innerHTML = html;
        }

        /**
         * Get time ago string
         */
        function getTimeAgo(date) {
            const seconds = Math.floor((new Date() - date) / 1000);
            
            let interval = seconds / 31536000;
            if (interval > 1) return Math.floor(interval) + ' years ago';
            
            interval = seconds / 2592000;
            if (interval > 1) return Math.floor(interval) + ' months ago';
            
            interval = seconds / 86400;
            if (interval > 1) return Math.floor(interval) + ' days ago';
            
            interval = seconds / 3600;
            if (interval > 1) return Math.floor(interval) + ' hours ago';
            
            interval = seconds / 60;
            if (interval > 1) return Math.floor(interval) + ' minutes ago';
            
            return 'Just now';
        }

        /**
         * Show loading overlay
         */
        function showLoading(message = 'Loading...') {
            const existing = document.getElementById('loadingOverlay');
            if (existing) return;
            
            const overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-content">
                    <div class="spinner"></div>
                    <div style="color: var(--text-primary); font-weight: 500;">${message}</div>
                </div>
            `;
            document.body.appendChild(overlay);
        }

        /**
         * Hide loading overlay
         */
        function hideLoading() {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.remove();
            }
        }

        /**
         * Save/load collapse state functions
         */
        function saveCollapseState(elementId, isExpanded) {
            try {
                localStorage.setItem(`collapse_${elementId}`, isExpanded ? 'expanded' : 'collapsed');
            } catch (error) {
                console.error('Error saving collapse state:', error);
            }
        }

        function loadCollapseState(elementId, iconId) {
            try {
                const state = localStorage.getItem(`collapse_${elementId}`);
                const element = document.getElementById(elementId);
                const icon = document.getElementById(iconId);
                
                if (element && icon && state === 'collapsed') {
                    element.style.display = 'none';
                    icon.textContent = '▶️';
                }
            } catch (error) {
                console.error('Error loading collapse state:', error);
            }
        }

        // View Management
        async function showView(viewName) {
            document.querySelectorAll('.container').forEach(el => el.classList.add('hidden'));
            document.getElementById(`${viewName}View`).classList.remove('hidden');
            
            document.querySelectorAll('.nav-link, .mobile-nav-item').forEach(link => {
                link.classList.remove('active');
            });
            
            if (event && event.target) event.target.classList.add('active');
            
            // Save current view to localStorage for persistence on refresh
            try {
                localStorage.setItem('lastView', viewName);
            } catch (error) {
                console.error('Error saving view state:', error);
            }
            
            if (viewName === 'home') {
                await loadInitialData();        // ensure data loaded first
                await updateHomeScreenStats();  // then update stats
            }
            if (viewName === 'dashboard') loadDashboard();
            if (viewName === 'reservations') loadReservations();
            if (viewName === 'guests') loadGuests();
            if (viewName === 'guestDocuments') loadGuestDocuments();
            if (viewName === 'payments') loadPayments();
            if (viewName === 'meals') loadMeals();
            if (viewName === 'availability') loadAvailabilityCalendar();
            if (viewName === 'properties') loadProperties();
            if (viewName === 'performance') initializePerformanceView();
            if (viewName === 'team') loadTeam();

        }
        function renderBookingTypeBreakdown(reservations, targetId) {
        const bookingTypes = {};

        reservations.forEach(r => {
            const type = r.booking_type || 'STAYCATION';
            if (!bookingTypes[type]) bookingTypes[type] = { count: 0, revenue: 0, nights: 0 };
            bookingTypes[type].count++;
            bookingTypes[type].revenue += parseFloat(r.total_amount) || 0;
            bookingTypes[type].nights += r.nights || 0;
        });

        const sortedTypes = Object.entries(bookingTypes).sort((a, b) => b[1].revenue - a[1].revenue);
        const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
        const totalCount = reservations.length;

        const target = document.getElementById(targetId);
        if (!target) return;

        if (sortedTypes.length === 0) {
            target.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-secondary);">No booking data available</div>';
            return;
        }

        const html = sortedTypes.map(([type, data]) => {
            const percentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : 0;
            const countPercentage = totalCount > 0 ? ((data.count / totalCount) * 100).toFixed(1) : 0;
            const typeInfo = (typeof BOOKING_TYPES !== 'undefined' && BOOKING_TYPES[type]) ? BOOKING_TYPES[type] : { label: type, icon: '📋' };
            const avgBookingValue = data.count > 0 ? data.revenue / data.count : 0;

            return `
            <div style="margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <span style="font-size:24px;">${typeInfo.icon}</span>
                    <div>
                    <div style="font-weight:600;font-size:15px;">${typeInfo.label}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">
                        ${data.count} bookings (${countPercentage}%) • ${data.nights} nights • Avg: ₹${Math.round(avgBookingValue).toLocaleString('en-IN')}
                    </div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;font-size:18px;color:var(--success);">₹${(data.revenue/100000).toFixed(1)}L</div>
                    <div style="font-size:12px;color:var(--text-secondary);">${percentage}% of revenue</div>
                </div>
                </div>
                <div style="background:var(--background);height:12px;border-radius:6px;overflow:hidden;">
                <div style="width:${percentage}%;height:100%;background:linear-gradient(90deg,#10b981,#059669);transition:width .5s;"></div>
                </div>
            </div>`;
        }).join('');

        target.innerHTML = html;
        }

        /**
         * Calculate total guests from reservations
         */
        function calculateTotalGuests(reservations) {
            return reservations.reduce((sum, r) => {
                const adults = parseInt(r.adults) || 0;
                const kids = parseInt(r.kids) || 0;
                return sum + adults + kids;
            }, 0);
        }

        /**
         * Calculate unique guests (by phone/email)
         */
        function calculateUniqueGuests(reservations) {
            const uniqueGuests = new Set();
            reservations.forEach(r => {
                const identifier = r.guest_phone || r.guest_email || r.guest_name;
                if (identifier) {
                    uniqueGuests.add(identifier.toLowerCase().trim());
                }
            });
            return uniqueGuests.size;
        }

        /**
         * Calculate average group size
         */
        function calculateAvgGroupSize(reservations) {
            if (reservations.length === 0) return '0.0';
            const totalGuests = calculateTotalGuests(reservations);
            return (totalGuests / reservations.length).toFixed(1);
        }

        /**
         * Auto-update reservation statuses based on dates
         * Runs silently in background
         */
        async function autoUpdateReservationStatuses() {
            try {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTime = today.getTime();
                
                let updatedCount = 0;
                const reservationsToUpdate = [];
                
                // Get all reservations
                const allReservations = state.reservations || [];
                
                for (const reservation of allReservations) {
                    // Skip cancelled reservations
                    if (reservation.status === 'cancelled') continue;
                    
                    const checkIn = new Date(reservation.check_in);
                    checkIn.setHours(0, 0, 0, 0);
                    const checkInTime = checkIn.getTime();
                    
                    const checkOut = new Date(reservation.check_out);
                    checkOut.setHours(0, 0, 0, 0);
                    const checkOutTime = checkOut.getTime();
                    
                    let newStatus = null;
                    
                    // Logic for status updates
                    if (reservation.status === 'confirmed' && todayTime >= checkInTime && todayTime < checkOutTime) {
                        // Check-in date has arrived
                        newStatus = 'checked-in';
                    } else if ((reservation.status === 'confirmed' || reservation.status === 'checked-in') && todayTime >= checkOutTime) {
                        // Check-out date has passed
                        newStatus = 'checked-out';
                    }
                    
                    // Update if status changed
                    if (newStatus && newStatus !== reservation.status) {
                        reservationsToUpdate.push({
                            bookingId: reservation.booking_id,
                            oldStatus: reservation.status,
                            newStatus: newStatus,
                            propertyName: reservation.property_name,
                            guestName: reservation.guest_name
                        });
                        
                        // Update in database
                        const { error } = await supabase
                            .from('reservations')
                            .update({ status: newStatus })
                            .eq('booking_id', reservation.booking_id);
                        
                        if (!error) {
                            // Update in local state
                            reservation.status = newStatus;
                            updatedCount++;
                        }
                    }
                }
                
                // Silent update - only log to console
                if (updatedCount > 0) {
                    console.log(`✅ Auto-updated ${updatedCount} reservation status(es):`);
                    reservationsToUpdate.forEach(r => {
                        console.log(`  - ${r.guestName} at ${r.propertyName}: ${r.oldStatus} → ${r.newStatus}`);
                    });
                    
                    // Refresh current view silently
                    const currentView = localStorage.getItem('lastView') || 'home';
                    if (currentView === 'dashboard') {
                        await loadDashboard();
                    } else if (currentView === 'reservations') {
                        await loadReservations();
                    } else if (currentView === 'home') {
                        await updateHomeScreenStats();
                    }
                }
                
            } catch (error) {
                console.error('Error auto-updating statuses:', error);
                // Silent fail - don't show error to user
            }
        }

        /**
         * Schedule auto-status updates
         */
        function scheduleAutoStatusUpdates() {
            // Run immediately on load (after 2 seconds to let app initialize)
            setTimeout(() => autoUpdateReservationStatuses(), 2000);
            
            // Run every hour (3600000 ms = 1 hour)
            setInterval(() => autoUpdateReservationStatuses(), 3600000);
            
            console.log('✅ Auto status update scheduler initialized');
        }

        /**
         * Save filter state to localStorage
         */
        function saveFilterState(viewName, filters) {
            try {
                const filterState = JSON.parse(localStorage.getItem('filterState') || '{}');
                filterState[viewName] = {
                    ...filters,
                    timestamp: Date.now()
                };
                localStorage.setItem('filterState', JSON.stringify(filterState));
                console.log(`✅ Saved ${viewName} filters:`, filters);
            } catch (error) {
                console.error('Error saving filter state:', error);
            }
        }

        /**
         * Load filter state from localStorage
         */
        function loadFilterState(viewName) {
            try {
                const filterState = JSON.parse(localStorage.getItem('filterState') || '{}');
                const viewFilters = filterState[viewName];
                
                // Return filters if they exist and are less than 24 hours old
                if (viewFilters && (Date.now() - viewFilters.timestamp) < 86400000) {
                    console.log(`✅ Loaded ${viewName} filters:`, viewFilters);
                    return viewFilters;
                }
                return null;
            } catch (error) {
                console.error('Error loading filter state:', error);
                return null;
            }
        }

        /**
         * Clear filter state for a view
         */
        function clearFilterState(viewName) {
            try {
                const filterState = JSON.parse(localStorage.getItem('filterState') || '{}');
                delete filterState[viewName];
                localStorage.setItem('filterState', JSON.stringify(filterState));
                console.log(`✅ Cleared ${viewName} filters`);
            } catch (error) {
                console.error('Error clearing filter state:', error);
            }
        }

        // Dashboard
        async function loadDashboard() {
            try {
                allReservations = await db.getReservations();
                allPayments = await db.getAllPayments();
                const properties = await db.getProperties();

                // Update global state for home screen
                state.reservations = allReservations;
                state.properties = properties;
                state.payments = allPayments;
                
                const confirmedReservations = allReservations.filter(r => r.status !== 'cancelled');
                const totalRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                const totalOtaFees = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.ota_service_fee) || 0), 0);
                const netRevenue = totalRevenue - totalOtaFees;
                const activeBookings = allReservations.filter(r => r.status === 'checked-in').length;
                const upcomingBookings = allReservations.filter(r => r.status === 'confirmed').length;
                const avgBookingValue = confirmedReservations.length > 0 ? totalRevenue / confirmedReservations.length : 0;
                const completedBookings = allReservations.filter(r => r.status === 'checked-out').length;
                
                // Update primary stats
                document.getElementById('totalReservations').textContent = allReservations.length;
                document.getElementById('activeReservations').textContent = activeBookings;
                document.getElementById('upcomingReservations').textContent = upcomingBookings;
                document.getElementById('completedReservations').textContent = completedBookings;
                document.getElementById('avgBookingValue').textContent = Math.round(avgBookingValue).toLocaleString('en-IN');
                
                // Calculate enhanced metrics (CONSOLIDATED - no duplicates)
                const hostizzyRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const totalNights = confirmedReservations.reduce((sum, r) => sum + (r.nights || 0), 0);
                const targetNights = properties.length * TARGET_OCCUPANCY_NIGHTS;
                const occupancyRate = targetNights > 0 ? ((totalNights / targetNights) * 100).toFixed(1) : 0;
                
                // Enhanced metrics cards with OTA fees
                let enhancedHTML = `
                    <div class="metric-card" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);">
                        <div class="metric-icon">💰</div>
                        <div class="metric-value">${formatCurrency(totalRevenue)}</div>
                        <div class="metric-label">Total Revenue</div>
                        <div class="metric-trend">From ${confirmedReservations.length} bookings</div>
                    </div>`;
                
                // Add OTA fees card if there are any OTA fees
                if (totalOtaFees > 0) {
                    enhancedHTML += `
                    <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        <div class="metric-icon">🏢</div>
                        <div class="metric-value">${formatCurrency(totalOtaFees)}</div>
                        <div class="metric-label">OTA Fees</div>
                        <div class="metric-trend">Commission deductions</div>
                    </div>
                    <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <div class="metric-icon">💵</div>
                        <div class="metric-value">${formatCurrency(netRevenue)}</div>
                        <div class="metric-label">Net Revenue</div>
                        <div class="metric-trend">After OTA fees</div>
                    </div>`;
                }
                
                enhancedHTML += `
                    <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <div class="metric-icon">📊</div>
                        <div class="metric-value">${occupancyRate}%</div>
                        <div class="metric-label">Occupancy Rate</div>
                        <div class="metric-trend">${totalNights}/${targetNights} nights booked</div>
                    </div>
                    <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                        <div class="metric-icon">🏆</div>
                        <div class="metric-value">${formatCurrency(hostizzyRevenue)}</div>
                        <div class="metric-label">Hostizzy Revenue</div>
                        <div class="metric-trend">${totalRevenue > 0 ? ((hostizzyRevenue/totalRevenue)*100).toFixed(1) : 0}% of total</div>
                    </div>
                    <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                        <div class="metric-icon">📅</div>
                        <div class="metric-value">${activeBookings}</div>
                        <div class="metric-label">Active Now</div>
                        <div class="metric-trend">${upcomingBookings} upcoming</div>
                    </div>
                    <div class="metric-card" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
                        <div class="metric-icon">👥</div>
                        <div class="metric-value">${calculateTotalGuests(confirmedReservations)}</div>
                        <div class="metric-label">Total Guests</div>
                        <div class="metric-trend">${calculateUniqueGuests(confirmedReservations)} unique</div>
                    </div>
                    <div class="metric-card" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);">
                        <div class="metric-icon">👨‍👩‍👧‍👦</div>
                        <div class="metric-value">${calculateAvgGroupSize(confirmedReservations)}</div>
                        <div class="metric-label">Avg Group Size</div>
                        <div class="metric-trend">Per booking</div>
                    </div>
                `;
                
                document.getElementById('enhancedMetrics').innerHTML = enhancedHTML;
                
                // Payment Analytics - Revenue Split
                renderRevenueSplit(allPayments, confirmedReservations);

                // REMOVED CHARTS - Now in Performance Page
                // renderPaymentMethodChart(allPayments);
                // renderTopProperties(confirmedReservations, properties);
                // renderChannelDistribution(confirmedReservations);
                // renderBookingTypeBreakdown(confirmedReservations, 'bookingTypeBreakdown');
                // renderMonthlyTrends(confirmedReservations);

                // Action Center
                renderActionCenter(confirmedReservations);

                // Calculate monthly metrics
                calculateMonthlyMetrics();
                
                // Load AI Insights
                loadAIInsights(confirmedReservations, properties);
                
                // Load Top 15 Properties Stats
                updateTopPropertiesStats();

                // Add this at the very end:
                calculateMonthlyMetrics();
                
                // Restore saved filter state
                setTimeout(() => {
                    const savedFilters = loadFilterState('dashboard');
                    if (savedFilters) {
                        console.log('🔄 Restoring dashboard filters:', savedFilters);
                        
                        // Restore date range if exists
                        if (savedFilters.startDate && savedFilters.endDate) {
                            const startDateInput = document.getElementById('startDate');
                            const endDateInput = document.getElementById('endDate');
                            
                            if (startDateInput) startDateInput.value = savedFilters.startDate;
                            if (endDateInput) endDateInput.value = savedFilters.endDate;
                            
                            // Auto-apply the saved date range
                            setTimeout(() => applyDateRange(), 200);
                        }
                        
                        // Restore quick filter if exists
                        if (savedFilters.quickFilter && savedFilters.quickFilter !== 'all') {
                            setTimeout(() => applyQuickFilter(savedFilters.quickFilter), 300);
                        }
                    }
                }, 500);
                
            } catch (error) {
                console.error('Dashboard error:', error);
                showToast('Error', 'Failed to load dashboard', '❌');
            }
        }

        // Quick Filter State
        let currentQuickFilter = 'all';

        async function applyQuickFilter(filter) {
            currentQuickFilter = filter;
            
            // Update UI
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.remove('active');
            });
            document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
            
            // Get all reservations
            let filteredReservations = [...allReservations];
            
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            // Apply filter logic
            switch(filter) {
                case 'next-7-days':
                    const next7Days = new Date(today);
                    next7Days.setDate(today.getDate() + 7);
                    filteredReservations = filteredReservations.filter(r => {
                        const checkIn = new Date(r.check_in);
                        return checkIn >= today && checkIn <= next7Days && r.status !== 'cancelled';
                    });
                    updateFilterInfo(`📅 Next 7 Days (${filteredReservations.length} bookings)`);
                    break;
                    
                case 'today':
                    filteredReservations = filteredReservations.filter(r => {
                        const checkIn = new Date(r.check_in);
                        const checkOut = new Date(r.check_out);
                        checkIn.setHours(0, 0, 0, 0);
                        checkOut.setHours(0, 0, 0, 0);
                        today.setHours(0, 0, 0, 0);
                        return (checkIn.getTime() === today.getTime() || checkOut.getTime() === today.getTime()) 
                            && r.status !== 'cancelled';
                    });
                    updateFilterInfo(`🏠 Today's Activity (${filteredReservations.length} check-ins/outs)`);
                    break;
                    
                case 'payment-due':
                    filteredReservations = filteredReservations.filter(r => {
                        if (r.status === 'cancelled') return false;
                        const total = parseFloat(r.total_amount) || 0;
                        const paid = parseFloat(r.paid_amount) || 0;
                        const otaFee = parseFloat(r.ota_service_fee) || 0;
                        const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                        const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                        return balance > 0;
                    });
                    updateFilterInfo(`💰 Payment Due (${filteredReservations.length} with outstanding balance)`);
                    break;
                    
                case 'this-month':
                    filteredReservations = filteredReservations.filter(r => {
                        const checkIn = new Date(r.check_in);
                        return checkIn >= startOfMonth && checkIn <= endOfMonth;
                    });
                    updateFilterInfo(`📆 This Month (${filteredReservations.length} bookings)`);
                    break;
                    
                case 'needs-attention':
                    filteredReservations = filteredReservations.filter(r => {
                        if (r.status === 'cancelled') return false;
                        
                        const checkInDate = new Date(r.check_in);
                        checkInDate.setHours(0, 0, 0, 0);
                        const total = parseFloat(r.total_amount) || 0;
                        const paid = parseFloat(r.paid_amount) || 0;
                        const otaFee = parseFloat(r.ota_service_fee) || 0;
                        const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                        const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                        
                        // Needs attention if:
                        // 1. Overdue payment
                        // 2. Check-in today/tomorrow with pending payment
                        // 3. Missing guest contact info
                        const tomorrow = new Date(today);
                        tomorrow.setDate(today.getDate() + 1);
                        
                        const overduePayment = balance > 0 && checkInDate < today;
                        const soonCheckinUnpaid = (checkInDate.getTime() === today.getTime() || 
                                                  checkInDate.getTime() === tomorrow.getTime()) && balance > 0;
                        const missingInfo = !r.guest_phone || !r.guest_email;
                        
                        return overduePayment || soonCheckinUnpaid || missingInfo;
                    });
                    updateFilterInfo(`⚠️ Needs Attention (${filteredReservations.length} items)`);
                    break;
                    
                case 'all':
                default:
                    updateFilterInfo('');
                    break;
            }
            
            // Re-render dashboard with filtered data
            const confirmedReservations = filteredReservations.filter(r => r.status !== 'cancelled');
            
            // Calculate all metrics with filtered data
            const totalRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
            const totalOtaFees = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.ota_service_fee) || 0), 0);
            const netRevenue = totalRevenue - totalOtaFees;
            const activeBookings = filteredReservations.filter(r => r.status === 'checked-in').length;
            const upcomingBookings = filteredReservations.filter(r => r.status === 'confirmed').length;
            const completedBookings = filteredReservations.filter(r => r.status === 'checked-out').length;
            const avgBookingValue = confirmedReservations.length > 0 ? totalRevenue / confirmedReservations.length : 0;
            
            // Update primary stats
            document.getElementById('totalReservations').textContent = filteredReservations.length;
            document.getElementById('activeReservations').textContent = activeBookings;
            document.getElementById('upcomingReservations').textContent = upcomingBookings;
            document.getElementById('completedReservations').textContent = completedBookings;
            document.getElementById('avgBookingValue').textContent = Math.round(avgBookingValue).toLocaleString('en-IN');
            
            // Calculate enhanced metrics with filtered data
            const properties = await db.getProperties();
            const hostizzyRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
            const totalNights = confirmedReservations.reduce((sum, r) => sum + (r.nights || 0), 0);
            const targetNights = properties.length * TARGET_OCCUPANCY_NIGHTS;
            const occupancyRate = targetNights > 0 ? ((totalNights / targetNights) * 100).toFixed(1) : 0;
            
            // Update Enhanced Metrics cards
            let enhancedHTML = `
                <div class="metric-card" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);">
                    <div class="metric-icon">💰</div>
                    <div class="metric-value">${formatCurrency(totalRevenue)}</div>
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-trend">From ${confirmedReservations.length} bookings</div>
                </div>`;
            
            // Add OTA fees card if there are any OTA fees
            if (totalOtaFees > 0) {
                enhancedHTML += `
                <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="metric-icon">🏢</div>
                    <div class="metric-value">${formatCurrency(totalOtaFees)}</div>
                    <div class="metric-label">OTA Fees</div>
                    <div class="metric-trend">Commission deductions</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="metric-icon">💵</div>
                    <div class="metric-value">${formatCurrency(netRevenue)}</div>
                    <div class="metric-label">Net Revenue</div>
                    <div class="metric-trend">After OTA fees</div>
                </div>`;
            }
            
            enhancedHTML += `
                <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">${occupancyRate}%</div>
                    <div class="metric-label">Occupancy Rate</div>
                    <div class="metric-trend">${totalNights}/${targetNights} nights booked</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                    <div class="metric-icon">🏆</div>
                    <div class="metric-value">${formatCurrency(hostizzyRevenue)}</div>
                    <div class="metric-label">Hostizzy Revenue</div>
                    <div class="metric-trend">${totalRevenue > 0 ? ((hostizzyRevenue/totalRevenue)*100).toFixed(1) : 0}% of total</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="metric-icon">📅</div>
                    <div class="metric-value">${activeBookings}</div>
                    <div class="metric-label">Active Now</div>
                    <div class="metric-trend">${upcomingBookings} upcoming</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);">
                    <div class="metric-icon">👥</div>
                    <div class="metric-value">${calculateTotalGuests(confirmedReservations)}</div>
                    <div class="metric-label">Total Guests</div>
                    <div class="metric-trend">${calculateUniqueGuests(confirmedReservations)} unique</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);">
                    <div class="metric-icon">👨‍👩‍👧‍👦</div>
                    <div class="metric-value">${calculateAvgGroupSize(confirmedReservations)}</div>
                    <div class="metric-label">Avg Group Size</div>
                    <div class="metric-trend">Per booking</div>
                </div>
            `;
            
            document.getElementById('enhancedMetrics').innerHTML = enhancedHTML;
            
            // Update Payment Analytics - Revenue Split with filtered data
            renderRevenueSplit(allPayments, confirmedReservations);

            // Re-render Action Center with filtered data
            renderActionCenter(filteredReservations);

            // Recalculate monthly metrics with filtered data
            calculateMonthlyMetricsFiltered(filteredReservations);
            
            // Load AI Insights with filtered data
            loadAIInsights(confirmedReservations, properties);
            
            // Update top 15 properties with filtered data
            updateTopPropertiesStats(filteredReservations);
        }

        /**
         * Update filter info display
         */
        function updateFilterInfo(text) {
            const infoDiv = document.getElementById('activeFilterInfo');
            const textSpan = document.getElementById('activeFilterText');
            
            if (text) {
                textSpan.textContent = text;
                infoDiv.style.display = 'block';
            } else {
                infoDiv.style.display = 'none';
            }
        }

        /**
         * Apply date range filter
         */
        async function applyDateRange(range) {
            if (!range) return;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let startDate, endDate;
            
            switch(range) {
                case 'today':
                    startDate = new Date(today);
                    endDate = new Date(today);
                    break;
                case 'yesterday':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 1);
                    endDate = new Date(startDate);
                    break;
                case 'last-7':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 7);
                    endDate = new Date(today);
                    break;
                case 'last-30':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - 30);
                    endDate = new Date(today);
                    break;
                case 'this-week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay());
                    endDate = new Date(today);
                    break;
                case 'last-week':
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() - today.getDay() - 7);
                    endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 6);
                    break;
                case 'this-month':
                    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    break;
                case 'last-month':
                    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                    break;
                case 'this-quarter':
                    const quarter = Math.floor(today.getMonth() / 3);
                    startDate = new Date(today.getFullYear(), quarter * 3, 1);
                    endDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
                    break;
                case 'this-year':
                    startDate = new Date(today.getFullYear(), 0, 1);
                    endDate = new Date(today.getFullYear(), 11, 31);
                    break;
            }
            
            // Filter reservations by date range
            let filteredReservations = allReservations.filter(r => {
                const checkIn = new Date(r.check_in);
                checkIn.setHours(0, 0, 0, 0);
                return checkIn >= startDate && checkIn <= endDate;
            });
            
            // Clear active quick filter
            document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
            currentQuickFilter = 'custom';
            
            // Show filter info
            const rangeLabels = {
                'today': 'Today',
                'yesterday': 'Yesterday',
                'last-7': 'Last 7 Days',
                'last-30': 'Last 30 Days',
                'this-week': 'This Week',
                'last-week': 'Last Week',
                'this-month': 'This Month',
                'last-month': 'Last Month',
                'this-quarter': 'This Quarter',
                'this-year': 'This Year'
            };
            updateFilterInfo(`📅 ${rangeLabels[range]} (${filteredReservations.length} bookings)`);
            
            // Update dashboard with filtered data
            await updateDashboardWithFilteredData(filteredReservations);

            // Save filter state
            saveFilterState('dashboard', {
                quickFilter: currentQuickFilter,
                startDate: document.getElementById('startDate')?.value || '',
                endDate: document.getElementById('endDate')?.value || ''
            });
        }

        /**
         * Clear all dashboard filters and reload
         */
        async function clearDashboardFilters() {
            // Clear filter state
            clearFilterState('dashboard');
            
            // Reset UI
            document.getElementById('quickDateRange').value = '';
            document.querySelectorAll('.filter-chip').forEach(chip => {
                chip.classList.remove('active');
                if (chip.dataset.filter === 'all') {
                    chip.classList.add('active');
                }
            });
            currentQuickFilter = 'all';
            
            // Clear filter info
            const filterInfo = document.getElementById('filterInfo');
            if (filterInfo) filterInfo.style.display = 'none';
            
            // Reload dashboard with all data
            await loadDashboard();
            
            showToast('Filters Cleared', 'Showing all data', '✅');
        }

        /**
         * Toggle advanced filters panel
         */
        async function toggleAdvancedFilters() {
            const panel = document.getElementById('advancedFiltersPanel');
            
            if (panel.style.display === 'none') {
                // Populate property dropdown
                const properties = await db.getProperties();
                const propertySelect = document.getElementById('advFilterProperty');
                propertySelect.innerHTML = properties.map(p => 
                    `<option value="${p.id}">${p.name}</option>`
                ).join('');
                
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        }

        /**
         * Apply advanced filters
         */
        async function applyAdvancedFilters() {
            let filteredReservations = [...allReservations];
            const filterLabels = [];
            
            // Date range
            const startDate = document.getElementById('advFilterStartDate').value;
            const endDate = document.getElementById('advFilterEndDate').value;
            if (startDate || endDate) {
                filteredReservations = filteredReservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    const start = startDate ? new Date(startDate) : new Date('1900-01-01');
                    const end = endDate ? new Date(endDate) : new Date('2100-12-31');
                    return checkIn >= start && checkIn <= end;
                });
                if (startDate && endDate) {
                    filterLabels.push(`📅 ${startDate} to ${endDate}`);
                } else if (startDate) {
                    filterLabels.push(`📅 From ${startDate}`);
                } else {
                    filterLabels.push(`📅 Until ${endDate}`);
                }
            }
            
            // Status
            const statusOptions = Array.from(document.getElementById('advFilterStatus').selectedOptions);
            if (statusOptions.length > 0) {
                const statuses = statusOptions.map(o => o.value);
                filteredReservations = filteredReservations.filter(r => statuses.includes(r.status));
                filterLabels.push(`📋 Status: ${statuses.join(', ')}`);
            }
            
            // Property
            const propertyOptions = Array.from(document.getElementById('advFilterProperty').selectedOptions);
            if (propertyOptions.length > 0) {
                const propertyIds = propertyOptions.map(o => parseInt(o.value));
                filteredReservations = filteredReservations.filter(r => propertyIds.includes(r.property_id));
                filterLabels.push(`🏠 ${propertyOptions.length} properties`);
            }
            
            // Payment status
            const paymentStatus = document.getElementById('advFilterPayment').value;
            if (paymentStatus) {
                filteredReservations = filteredReservations.filter(r => r.payment_status === paymentStatus);
                filterLabels.push(`💰 Payment: ${paymentStatus}`);
            }
            
            // Booking source
            const source = document.getElementById('advFilterSource').value;
            if (source) {
                filteredReservations = filteredReservations.filter(r => r.booking_source === source);
                filterLabels.push(`📱 Source: ${source}`);
            }
            
            // Amount range
            const minAmount = document.getElementById('advFilterMinAmount').value;
            const maxAmount = document.getElementById('advFilterMaxAmount').value;
            if (minAmount || maxAmount) {
                filteredReservations = filteredReservations.filter(r => {
                    const amount = parseFloat(r.total_amount) || 0;
                    const min = minAmount ? parseFloat(minAmount) : 0;
                    const max = maxAmount ? parseFloat(maxAmount) : Infinity;
                    return amount >= min && amount <= max;
                });
                if (minAmount && maxAmount) {
                    filterLabels.push(`💵 ₹${minAmount} - ₹${maxAmount}`);
                } else if (minAmount) {
                    filterLabels.push(`💵 Min ₹${minAmount}`);
                } else {
                    filterLabels.push(`💵 Max ₹${maxAmount}`);
                }
            }
            
            // Clear active quick filter
            document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
            currentQuickFilter = 'advanced';
            
            // Show filter info
            if (filterLabels.length > 0) {
                updateFilterInfo(`🔍 Advanced: ${filterLabels.join(' • ')}`);
            }
            
            // Close panel
            toggleAdvancedFilters();
            
            // Update dashboard
            await updateDashboardWithFilteredData(filteredReservations);
            
            showToast('Filters Applied', `Showing ${filteredReservations.length} matching bookings`, '✅');
        }

        /**
         * Clear advanced filters
         */
        function clearAdvancedFilters() {
            document.getElementById('advFilterStartDate').value = '';
            document.getElementById('advFilterEndDate').value = '';
            document.getElementById('advFilterStatus').selectedIndex = -1;
            document.getElementById('advFilterProperty').selectedIndex = -1;
            document.getElementById('advFilterPayment').value = '';
            document.getElementById('advFilterSource').value = '';
            document.getElementById('advFilterMinAmount').value = '';
            document.getElementById('advFilterMaxAmount').value = '';
        }

        /**
         * Clear all filters and reset
         */
        async function clearAllFilters() {
            // Clear quick filters
            document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
            document.querySelector('[data-filter="all"]').classList.add('active');
            currentQuickFilter = 'all';
            
            // Clear date range
            document.getElementById('quickDateRange').value = '';
            
            // Clear advanced filters
            clearAdvancedFilters();
            
            // Hide filter info
            updateFilterInfo('');
            
            // Reload full dashboard
            await loadDashboard();
            
            showToast('Filters Cleared', 'Showing all data', 'ℹ️');
        }

        /**
         * Update dashboard with filtered data (extracted for reuse)
         */
        async function updateDashboardWithFilteredData(filteredReservations) {
            const confirmedReservations = filteredReservations.filter(r => r.status !== 'cancelled');
            
            // Calculate all metrics with filtered data
            const totalRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
            const totalOtaFees = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.ota_service_fee) || 0), 0);
            const netRevenue = totalRevenue - totalOtaFees;
            const activeBookings = filteredReservations.filter(r => r.status === 'checked-in').length;
            const upcomingBookings = filteredReservations.filter(r => r.status === 'confirmed').length;
            const completedBookings = filteredReservations.filter(r => r.status === 'checked-out').length;
            const avgBookingValue = confirmedReservations.length > 0 ? totalRevenue / confirmedReservations.length : 0;
            
            // Update primary stats
            document.getElementById('totalReservations').textContent = filteredReservations.length;
            document.getElementById('activeReservations').textContent = activeBookings;
            document.getElementById('upcomingReservations').textContent = upcomingBookings;
            document.getElementById('completedReservations').textContent = completedBookings;
            document.getElementById('avgBookingValue').textContent = Math.round(avgBookingValue).toLocaleString('en-IN');
            
            // Calculate enhanced metrics with filtered data
            const properties = await db.getProperties();
            const hostizzyRevenue = confirmedReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
            const totalNights = confirmedReservations.reduce((sum, r) => sum + (r.nights || 0), 0);
            const targetNights = properties.length * TARGET_OCCUPANCY_NIGHTS;
            const occupancyRate = targetNights > 0 ? ((totalNights / targetNights) * 100).toFixed(1) : 0;
            
            // Update Enhanced Metrics cards
            let enhancedHTML = `
                <div class="metric-card" style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);">
                    <div class="metric-icon">💰</div>
                    <div class="metric-value">${formatCurrency(totalRevenue)}</div>
                    <div class="metric-label">Total Revenue</div>
                    <div class="metric-trend">From ${confirmedReservations.length} bookings</div>
                </div>`;
            
            if (totalOtaFees > 0) {
                enhancedHTML += `
                <div class="metric-card" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                    <div class="metric-icon">🏢</div>
                    <div class="metric-value">${formatCurrency(totalOtaFees)}</div>
                    <div class="metric-label">OTA Fees</div>
                    <div class="metric-trend">Commission deductions</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="metric-icon">💵</div>
                    <div class="metric-value">${formatCurrency(netRevenue)}</div>
                    <div class="metric-label">Net Revenue</div>
                    <div class="metric-trend">After OTA fees</div>
                </div>`;
            }
            
            enhancedHTML += `
                <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">${occupancyRate}%</div>
                    <div class="metric-label">Occupancy Rate</div>
                    <div class="metric-trend">${totalNights}/${targetNights} nights booked</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
                    <div class="metric-icon">🏆</div>
                    <div class="metric-value">${formatCurrency(hostizzyRevenue)}</div>
                    <div class="metric-label">Hostizzy Revenue</div>
                    <div class="metric-trend">${totalRevenue > 0 ? ((hostizzyRevenue/totalRevenue)*100).toFixed(1) : 0}% of total</div>
                </div>
                <div class="metric-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    <div class="metric-icon">📅</div>
                    <div class="metric-value">${activeBookings}</div>
                    <div class="metric-label">Active Now</div>
                    <div class="metric-trend">${upcomingBookings} upcoming</div>
                </div>
            `;
            
            document.getElementById('enhancedMetrics').innerHTML = enhancedHTML;
            
            // Update other sections
            renderRevenueSplit(allPayments, confirmedReservations);
            renderActionCenter(filteredReservations);
            calculateMonthlyMetricsFiltered(filteredReservations);
            loadAIInsights(confirmedReservations, properties);
            updateTopPropertiesStats(filteredReservations);
        }

        /**
         * Calculate and display monthly performance with filtered data
         */
        function calculateMonthlyMetricsFiltered(filteredReservations) {
            try {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Update month label
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
                document.getElementById('currentMonthLabel').textContent = `${monthNames[currentMonth]} ${currentYear}`;
                
                // Filter current month reservations from the already filtered data
                const currentMonthReservations = filteredReservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    return checkIn.getMonth() === currentMonth && checkIn.getFullYear() === currentYear;
                });
                
                // Filter last month reservations from filtered data
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                
                const lastMonthReservations = filteredReservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    return checkIn.getMonth() === lastMonth && checkIn.getFullYear() === lastMonthYear;
                });
                
                // Calculate Nights
                const currentNights = currentMonthReservations.reduce((sum, r) => sum + (parseInt(r.nights) || 0), 0);
                const lastNights = lastMonthReservations.reduce((sum, r) => sum + (parseInt(r.nights) || 0), 0);
                const nightsChange = lastNights > 0 ? ((currentNights - lastNights) / lastNights * 100) : 0;
                
                // Calculate Revenue
                const currentRevenue = currentMonthReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                const lastRevenue = lastMonthReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100) : 0;
                
                // Calculate Hostizzy Revenue
                const currentHostizzy = currentMonthReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const lastHostizzy = lastMonthReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const hostizzyChange = lastHostizzy > 0 ? ((currentHostizzy - lastHostizzy) / lastHostizzy * 100) : 0;
                
                // Update UI - Nights
                document.getElementById('monthNights').textContent = currentNights;
                updateTrendDisplay('monthNightsChange', nightsChange);
                
                // Update UI - Revenue
                if (currentRevenue >= 100000) {
                    document.getElementById('monthRevenue').textContent = '₹' + (currentRevenue / 100000).toFixed(2) + 'L';
                } else {
                    document.getElementById('monthRevenue').textContent = '₹' + (currentRevenue / 1000).toFixed(1) + 'K';
                }
                updateTrendDisplay('monthRevenueChange', revenueChange);
                
                // Update UI - Hostizzy Revenue
                if (currentHostizzy >= 100000) {
                    document.getElementById('monthHostizzyRevenue').textContent = '₹' + (currentHostizzy / 100000).toFixed(2) + 'L';
                } else {
                    document.getElementById('monthHostizzyRevenue').textContent = '₹' + (currentHostizzy / 1000).toFixed(1) + 'K';
                }
                updateTrendDisplay('monthHostizzyChange', hostizzyChange);
                
            } catch (error) {
                console.error('Error calculating monthly metrics (filtered):', error);
            }
        }

        /**
         * Calculate and display this month's performance with comparison to last month
         */
        function calculateMonthlyMetrics() {
            try {
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                
                // Update month label
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                                'July', 'August', 'September', 'October', 'November', 'December'];
                document.getElementById('currentMonthLabel').textContent = `${monthNames[currentMonth]} ${currentYear}`;
                
                // Filter current month reservations (based on check-in date)
                const currentMonthReservations = allReservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    return checkIn.getMonth() === currentMonth && checkIn.getFullYear() === currentYear;
                });
                
                // Filter last month reservations
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                
                const lastMonthReservations = allReservations.filter(r => {
                    const checkIn = new Date(r.check_in);
                    return checkIn.getMonth() === lastMonth && checkIn.getFullYear() === lastMonthYear;
                });
                
                // Calculate Nights
                const currentNights = currentMonthReservations.reduce((sum, r) => sum + (parseInt(r.nights) || 0), 0);
                const lastNights = lastMonthReservations.reduce((sum, r) => sum + (parseInt(r.nights) || 0), 0);
                const nightsChange = lastNights > 0 ? ((currentNights - lastNights) / lastNights * 100) : 0;
                
                // Calculate Revenue
                const currentRevenue = currentMonthReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                const lastRevenue = lastMonthReservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100) : 0;
                
                // Calculate Hostizzy Revenue
                const currentHostizzy = currentMonthReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const lastHostizzy = lastMonthReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const hostizzyChange = lastHostizzy > 0 ? ((currentHostizzy - lastHostizzy) / lastHostizzy * 100) : 0;
                
                // Update UI - Nights
                document.getElementById('monthNights').textContent = currentNights;
                updateTrendDisplay('monthNightsChange', nightsChange);
                
                // Update UI - Revenue
                if (currentRevenue >= 100000) {
                    document.getElementById('monthRevenue').textContent = '₹' + (currentRevenue / 100000).toFixed(2) + 'L';
                } else {
                    document.getElementById('monthRevenue').textContent = '₹' + (currentRevenue / 1000).toFixed(1) + 'K';
                }
                updateTrendDisplay('monthRevenueChange', revenueChange);
                
                // Update UI - Hostizzy Revenue
                if (currentHostizzy >= 100000) {
                    document.getElementById('monthHostizzyRevenue').textContent = '₹' + (currentHostizzy / 100000).toFixed(2) + 'L';
                } else {
                    document.getElementById('monthHostizzyRevenue').textContent = '₹' + (currentHostizzy / 1000).toFixed(1) + 'K';
                }
                updateTrendDisplay('monthHostizzyChange', hostizzyChange);
                
            } catch (error) {
                console.error('Error calculating monthly metrics:', error);
            }
        }

        /**
         * Update trend display with arrows and colors
         */
        function updateTrendDisplay(elementId, changePercent) {
            const el = document.getElementById(elementId);
            if (!el) return;
            
            const arrow = el.querySelector('.trend-arrow');
            const value = el.querySelector('.trend-value');
            
            if (!arrow || !value) return;
            
            const change = parseFloat(changePercent);
            
            if (change > 0) {
                arrow.textContent = '↑';
                arrow.className = 'trend-arrow trend-up';
                value.textContent = '+' + Math.abs(change).toFixed(1) + '%';
            } else if (change < 0) {
                arrow.textContent = '↓';
                arrow.className = 'trend-arrow trend-down';
                value.textContent = '-' + Math.abs(change).toFixed(1) + '%';
            } else {
                arrow.textContent = '→';
                arrow.className = 'trend-arrow trend-neutral';
                value.textContent = '0%';
            }
        }
        
        // Payment Analytics - Revenue Split
        function renderRevenueSplit(payments, reservations) {
            // Calculate Hostizzy vs Owner Revenue (from reservations, not payments)
            const hostizzyRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.hostizzy_revenue) || 0), 0
            );
            const totalRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.total_amount) || 0), 0
            );
            const ownerRevenue = totalRevenue - hostizzyRevenue;
            
            const hostizzyPercentage = totalRevenue > 0 ? ((hostizzyRevenue / totalRevenue) * 100).toFixed(1) : 0;
            const ownerPercentage = totalRevenue > 0 ? ((ownerRevenue / totalRevenue) * 100).toFixed(1) : 0;
            
            // Calculate Collection Status
            const totalPaid = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.paid_amount) || 0), 0
            );
            const pendingCollection = totalRevenue - totalPaid;
            const collectionRate = totalRevenue > 0 ? ((totalPaid / totalRevenue) * 100).toFixed(1) : 0;
            const pendingRate = (100 - collectionRate).toFixed(1);
            
            // Update Revenue Distribution
            document.getElementById('hostizzyTotal').textContent = '₹' + (hostizzyRevenue/100000).toFixed(1) + 'L';
            document.getElementById('ownerTotal').textContent = '₹' + (ownerRevenue/100000).toFixed(1) + 'L';
            document.getElementById('hostizzyPercentage').textContent = hostizzyPercentage + '% of total';
            document.getElementById('ownerPercentage').textContent = ownerPercentage + '% of total';
            
            // Update Payment Collection Status
            document.getElementById('totalCollected').textContent = '₹' + (totalPaid/100000).toFixed(1) + 'L';
            document.getElementById('pendingCollection').textContent = '₹' + (pendingCollection/100000).toFixed(1) + 'L';
            document.getElementById('collectionRate').textContent = collectionRate + '% collected';
            document.getElementById('pendingRate').textContent = pendingRate + '% remaining';
        }

        function renderPaymentMethodChart(payments, targetElementId = 'paymentMethodChart') {
            const methods = {};
            
            payments.forEach(p => {
                const method = p.payment_method || 'unknown';
                if (!methods[method]) {
                    methods[method] = { count: 0, amount: 0 };
                }
                methods[method].count += 1;
                methods[method].amount += parseFloat(p.amount) || 0;
            });
            
            const sortedMethods = Object.entries(methods)
                .sort((a, b) => b[1].amount - a[1].amount);
            
            const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const colors = { cash: '#10b981', upi: '#3b82f6', gateway: '#8b5cf6', bank_transfer: '#f59e0b' };
            const icons = { cash: '💵', upi: '📱', gateway: '💳', bank_transfer: '🏦' };
            
            const html = sortedMethods.length > 0 ? sortedMethods.map(([method, data]) => {
                const percentage = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : 0;
                return `
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                            <span style="font-weight: 600; font-size: 14px;">${icons[method] || '💳'} ${method.replace('_', ' ').toUpperCase()}</span>
                            <span style="font-weight: 700;">₹${(data.amount/1000).toFixed(1)}K (${percentage}%)</span>
                        </div>
                        <div style="background: var(--background); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${colors[method] || '#6b7280'}; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${data.count} transactions</div>
                    </div>
                `;
            }).join('') : '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No payment data available</div>';
            
            const element = document.getElementById(targetElementId);
            if (element) {
                element.innerHTML = html;
            }
        }

        /**
         * Top Properties Stats Functions (with sorting)
         */
        let currentSortBy = 'revenue';
        
        function updateTopPropertiesStats(filteredReservations = null) {
            sortPropertiesBy(currentSortBy, filteredReservations);
        }
        
        function sortPropertiesBy(sortType, filteredReservations = null) {
            currentSortBy = sortType;
            
            // Update button styles
            document.getElementById('sortByRevenue').style.background = sortType === 'revenue' ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('sortByBookings').style.background = sortType === 'bookings' ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('sortByNights').style.background = sortType === 'nights' ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('sortByGuests').style.background = sortType === 'guests' ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('sortByOccupancy').style.background = sortType === 'occupancy' ? 'var(--primary)' : 'var(--secondary)';
            
            try {
                // Get all properties
                const properties = state.properties || [];
                if (properties.length === 0) {
                    document.getElementById('topPropertiesStats').innerHTML = 
                        '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No properties found</div>';
                    return;
                }
                
                // Show filter indicator if filtered
                const reservationsToUse = filteredReservations || state.reservations || [];
                const isFiltered = filteredReservations && filteredReservations.length !== (state.reservations || []).length;
                
                // Calculate stats for each property
                const propertyStats = properties.map(property => {
                    // Use filtered reservations if provided, otherwise use all
                    const reservationsToUse = filteredReservations || state.reservations || [];
                    const propertyReservations = reservationsToUse.filter(r => 
                        r.property_id === property.id && r.status !== 'cancelled'
                    );
                    
                    const totalRevenue = propertyReservations.reduce((sum, r) => 
                        sum + (parseFloat(r.total_amount) || 0), 0
                    );
                    
                    const totalBookings = propertyReservations.length;
                    
                    // Calculate total nights (all bookings, not just last 90 days)
                    const totalNights = propertyReservations.reduce((sum, r) => 
                        sum + (parseInt(r.nights) || 0), 0
                    );
                    
                    // Calculate total guests
                    const totalGuests = propertyReservations.reduce((sum, r) => {
                        const adults = parseInt(r.adults) || 0;
                        const kids = parseInt(r.kids) || 0;
                        return sum + adults + kids;
                    }, 0);
                    
                    // Calculate occupancy rate (based on last 90 days)
                    const ninetyDaysAgo = new Date();
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    
                    const recentBookings = propertyReservations.filter(r => 
                        new Date(r.check_in) >= ninetyDaysAgo
                    );
                    
                    const recentNights = recentBookings.reduce((sum, r) => 
                        sum + (parseInt(r.nights) || 0), 0
                    );
                    
                    const occupancyRate = recentNights > 0 ? ((recentNights / 90) * 100).toFixed(1) : 0;
                    
                    // Calculate average booking value
                    const avgBookingValue = totalBookings > 0 ? (totalRevenue / totalBookings) : 0;
                    
                    // Get confirmed bookings
                    const confirmedBookings = propertyReservations.filter(r => 
                        r.status === 'confirmed' || r.status === 'checked-in'
                    ).length;
                    
                    return {
                        id: property.id,
                        name: property.name,
                        location: property.location || 'N/A',
                        totalRevenue,
                        totalBookings,
                        totalNights,
                        totalGuests,
                        confirmedBookings,
                        occupancyRate: parseFloat(occupancyRate),
                        avgBookingValue,
                        propertyType: property.property_type || 'Villa'
                    };
                });
                
                // Sort based on selected criteria
                let sortedProperties = [...propertyStats];
                if (sortType === 'revenue') {
                    sortedProperties.sort((a, b) => b.totalRevenue - a.totalRevenue);
                } else if (sortType === 'bookings') {
                    sortedProperties.sort((a, b) => b.totalBookings - a.totalBookings);
                } else if (sortType === 'nights') {
                    sortedProperties.sort((a, b) => b.totalNights - a.totalNights);
                } else if (sortType === 'guests') {
                    sortedProperties.sort((a, b) => b.totalGuests - a.totalGuests);
                } else if (sortType === 'occupancy') {
                    sortedProperties.sort((a, b) => b.occupancyRate - a.occupancyRate);
                }
                
                // Take top 15
                const top15 = sortedProperties.slice(0, 15);
                
                // Render property cards
                let html = '';
                
                // Add filter indicator if filtered
                if (isFiltered) {
                    html += `
                        <div style="margin-bottom: 16px; padding: 12px 16px; background: #e0e7ff; border-radius: 8px; font-size: 13px; color: #4338ca;">
                            📊 Showing stats based on filtered data (${reservationsToUse.length} bookings)
                        </div>
                    `;
                }
                
                html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">';
                
                top15.forEach((prop, index) => {
                    const rankColor = index < 3 ? 'var(--warning)' : 'var(--text-secondary)';
                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    
                    html += `
                        <div class="stat-card" style="position: relative; overflow: visible;">
                            <div style="position: absolute; top: -10px; right: -10px; background: ${rankColor}; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                                ${rankEmoji}
                            </div>
                            
                            <div style="margin-bottom: 12px;">
                                <h3 style="font-size: 18px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">
                                    ${prop.name}
                                </h3>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    📍 ${prop.location} • ${prop.propertyType}
                                </div>
                            </div>
                            
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px;">
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Total Revenue
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--success);">
                                        ${formatCurrency(prop.totalRevenue)}
                                    </div>
                                </div>
                                
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Bookings
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">
                                        ${prop.totalBookings}
                                    </div>
                                </div>
                                
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Total Nights
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--primary);">
                                        ${prop.totalNights}
                                    </div>
                                </div>
                                
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Total Guests
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: #06b6d4;">
                                        ${prop.totalGuests}
                                    </div>
                                </div>
                                
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Occupancy
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: ${prop.occupancyRate >= 70 ? 'var(--success)' : prop.occupancyRate >= 40 ? 'var(--warning)' : 'var(--danger)'};">
                                        ${prop.occupancyRate}%
                                    </div>
                                </div>
                                
                                <div>
                                    <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                        Avg Value
                                    </div>
                                    <div style="font-size: 20px; font-weight: 700; color: var(--text-primary);">
                                        ${formatCurrency(prop.avgBookingValue)}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        ${prop.confirmedBookings} confirmed
                                    </div>
                                    <button class="btn btn-sm" onclick="viewPropertyDetails(${prop.id})" style="padding: 6px 12px; font-size: 12px;">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                
                if (top15.length === 0) {
                    html = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No bookings data available for properties</div>';
                }
                
                document.getElementById('topPropertiesStats').innerHTML = html;
                
            } catch (error) {
                console.error('Error calculating property stats:', error);
                document.getElementById('topPropertiesStats').innerHTML = 
                    '<div style="text-align: center; padding: 40px; color: var(--danger);">Error loading property statistics</div>';
            }
        }
        
        function viewPropertyDetails(propertyId) {
            // Navigate to properties view and show details for this property
            showView('properties');
            // You could add code here to automatically open the property details modal
            showToast('Navigation', 'Opening property details...', '🏡');
        }

        /**
         * Load AI-powered insights based on current data
         */
        function loadAIInsights(reservations, properties) {
            const insights = [];
            
            // Calculate various metrics for insights
            const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
            const avgBookingValue = reservations.length > 0 ? totalRevenue / reservations.length : 0;
            
            // Analyze booking sources
            const sources = {};
            reservations.forEach(r => {
                const source = r.booking_source || 'DIRECT';
                sources[source] = (sources[source] || 0) + 1;
            });
            
            // Calculate property performance
            const propertyPerformance = {};
            reservations.forEach(r => {
                if (!propertyPerformance[r.property_id]) {
                    propertyPerformance[r.property_id] = {
                        name: r.property_name,
                        revenue: 0,
                        bookings: 0
                    };
                }
                propertyPerformance[r.property_id].revenue += parseFloat(r.total_amount) || 0;
                propertyPerformance[r.property_id].bookings += 1;
            });
            
            const sortedProps = Object.values(propertyPerformance).sort((a, b) => b.revenue - a.revenue);
            
            // Insight 1: Top performer analysis
            if (sortedProps.length > 0 && sortedProps[0].bookings > 5) {
                const topProp = sortedProps[0];
                const avgRevenue = topProp.revenue / topProp.bookings;
                insights.push({
                    icon: '🏆',
                    type: 'Top Performer',
                    title: 'Revenue Champion',
                    message: `${topProp.name} is your star property with ${formatCurrency(topProp.revenue)} revenue from ${topProp.bookings} bookings. Average booking value: ${formatCurrency(avgRevenue)}.`,
                    action: 'View Details',
                    color: 'rgba(16, 185, 129, 0.15)'
                });
            }
            
            // Insight 2: Channel optimization
            const maxSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
            if (maxSource && maxSource[1] > 3) {
                const percentage = ((maxSource[1] / reservations.length) * 100).toFixed(0);
                insights.push({
                    icon: '📊',
                    type: 'Channel Insight',
                    title: 'Booking Channel Leader',
                    message: `${maxSource[0]} brings ${percentage}% of your bookings. Consider optimizing your presence on this platform for even better results.`,
                    action: 'Optimize Channel',
                    color: 'rgba(37, 99, 235, 0.15)'
                });
            }
            
            // Insight 3: Revenue opportunity (underperforming properties)
            if (sortedProps.length > 2) {
                const lowPerformer = sortedProps[sortedProps.length - 1];
                if (lowPerformer.bookings < 3) {
                    insights.push({
                        icon: '💡',
                        type: 'Growth Opportunity',
                        title: 'Boost Underutilized Property',
                        message: `${lowPerformer.name} has potential for growth. Consider improving photos, adjusting pricing, or running targeted promotions.`,
                        action: 'Create Campaign',
                        color: 'rgba(245, 158, 11, 0.15)'
                    });
                }
            }
            
            // Insight 4: Pricing optimization
            if (avgBookingValue > 0) {
                const highValueProps = sortedProps.filter(p => (p.revenue / p.bookings) > avgBookingValue * 1.2);
                if (highValueProps.length > 0) {
                    insights.push({
                        icon: '💰',
                        type: 'Pricing Strategy',
                        title: 'Premium Pricing Success',
                        message: `${highValueProps.length} ${highValueProps.length === 1 ? 'property is' : 'properties are'} achieving 20%+ higher booking values. Apply similar strategies to other properties.`,
                        action: 'View Pricing',
                        color: 'rgba(139, 92, 246, 0.15)'
                    });
                }
            }
            
            // Insight 5: Occupancy alert
            const currentMonth = new Date().getMonth();
            const currentMonthBookings = reservations.filter(r => {
                const checkIn = new Date(r.check_in);
                return checkIn.getMonth() === currentMonth;
            });
            
            if (currentMonthBookings.length < properties.length * 2) {
                insights.push({
                    icon: '📅',
                    type: 'Occupancy Alert',
                    title: 'Increase Monthly Bookings',
                    message: `Current month has ${currentMonthBookings.length} bookings. Running flash sales or weekend deals could fill more nights.`,
                    action: 'Run Promotion',
                    color: 'rgba(239, 68, 68, 0.15)'
                });
            }
            
            // Insight 6: Guest satisfaction (based on confirmed vs cancelled)
            const cancelledCount = reservations.filter(r => r.status === 'cancelled').length;
            const cancelRate = reservations.length > 0 ? (cancelledCount / reservations.length) * 100 : 0;
            if (cancelRate < 5 && reservations.length > 10) {
                insights.push({
                    icon: '⭐',
                    type: 'Performance Metric',
                    title: 'Excellent Retention',
                    message: `Only ${cancelRate.toFixed(1)}% cancellation rate! Your properties are delivering great guest experiences.`,
                    action: 'Share Testimonials',
                    color: 'rgba(16, 185, 129, 0.15)'
                });
            }
            
            // Render insights
            const html = insights.map(insight => `
                <div style="background: ${insight.color}; backdrop-filter: blur(10px); border-radius: 12px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <div style="font-size: 28px;">${insight.icon}</div>
                        <div style="flex: 1;">
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; font-weight: 600;">${insight.type}</div>
                            <div style="font-size: 15px; font-weight: 700; margin-top: 2px;">${insight.title}</div>
                        </div>
                    </div>
                    <div style="font-size: 14px; line-height: 1.5; opacity: 0.95; margin-bottom: 12px;">
                        ${insight.message}
                    </div>
                    <button class="btn btn-sm" onclick="showToast('Feature Coming Soon', 'This AI feature will be available soon!', '🚀')" 
                            style="width: 100%; background: rgba(255, 255, 255, 0.9); color: var(--primary); border: none; font-weight: 600;">
                        ${insight.action}
                    </button>
                </div>
            `).join('');
            
            document.getElementById('aiInsightsContainer').innerHTML = insights.length > 0 ? html : 
                '<div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.7); grid-column: 1 / -1;">AI insights will appear here as you collect more data.</div>';
        }

        function renderTopProperties(reservations, properties, targetElementId = 'topPropertiesChart') {
            const propertyRevenue = {};
            
            reservations.forEach(r => {
                const propId = r.property_id;
                if (!propertyRevenue[propId]) {
                    propertyRevenue[propId] = {
                        name: r.property_name,
                        revenue: 0,
                        bookings: 0,
                        nights: 0
                    };
                }
                propertyRevenue[propId].revenue += parseFloat(r.total_amount) || 0;
                propertyRevenue[propId].bookings += 1;
                propertyRevenue[propId].nights += parseInt(r.nights) || 0;
            });
            
            const sortedProperties = Object.values(propertyRevenue)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 10); // Show top 10 instead of 5 in Performance page
            
            const maxRevenue = sortedProperties[0]?.revenue || 1;
            
            const html = sortedProperties.length > 0 ? sortedProperties.map((prop, index) => {
                const percentage = (prop.revenue / maxRevenue) * 100;
                const avgPerNight = prop.nights > 0 ? (prop.revenue / prop.nights) : 0;
                return `
                    <div style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: var(--primary); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${index + 1}</span>
                                <span style="font-weight: 600; font-size: 14px;">${prop.name}</span>
                            </div>
                            <span style="color: var(--success); font-weight: 700;">₹${(prop.revenue/100000).toFixed(2)}L</span>
                        </div>
                        <div style="background: var(--background); height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, var(--success), var(--primary)); transition: width 0.3s;"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            <span>${prop.bookings} bookings • ${prop.nights} nights</span>
                            <span>₹${Math.round(avgPerNight).toLocaleString('en-IN')}/night</span>
                        </div>
                    </div>
                `;
            }).join('') : '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No property data available</div>';
            
            const element = document.getElementById(targetElementId);
            if (element) {
                element.innerHTML = html;
            }
        }

        function renderChannelDistribution(reservations, targetElementId = 'channelDistribution') {
            const channels = {};
            
            reservations.forEach(r => {
                const source = r.booking_source || 'DIRECT';
                if (!channels[source]) {
                    channels[source] = { count: 0, revenue: 0 };
                }
                channels[source].count += 1;
                channels[source].revenue += parseFloat(r.total_amount) || 0;
            });
            
            const sortedChannels = Object.entries(channels)
                .sort((a, b) => b[1].revenue - a[1].revenue); // Sort by revenue instead of count
            
            const totalBookings = reservations.length;
            const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
            const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
            const icons = {
                'AIRBNB': '🏠',
                'BOOKING.COM': '🌐',
                'DIRECT': '📞',
                'INSTAGRAM': '📸',
                'WEBSITE': '💻',
                'REFERRAL': '👥'
            };
            
            const html = sortedChannels.length > 0 ? sortedChannels.map(([channel, data], index) => {
                const bookingPercentage = (data.count / totalBookings) * 100;
                const revenuePercentage = totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0;
                const avgBookingValue = data.count > 0 ? data.revenue / data.count : 0;
                
                return `
                    <div style="margin-bottom: 16px; padding: 12px; background: var(--background); border-radius: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 20px;">${icons[channel] || '📊'}</span>
                                <span style="font-weight: 600; font-size: 14px;">${channel}</span>
                            </div>
                            <span style="color: var(--success); font-weight: 700;">₹${(data.revenue/100000).toFixed(2)}L</span>
                        </div>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                            <div style="flex: 1;">
                                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Bookings</div>
                                <div style="background: rgba(37, 99, 235, 0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${bookingPercentage}%; height: 100%; background: ${colors[index % colors.length]}; transition: width 0.3s;"></div>
                                </div>
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Revenue</div>
                                <div style="background: rgba(16, 185, 129, 0.1); height: 6px; border-radius: 3px; overflow: hidden;">
                                    <div style="width: ${revenuePercentage}%; height: 100%; background: ${colors[index % colors.length]}; transition: width 0.3s;"></div>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary);">
                            <span>${data.count} bookings (${bookingPercentage.toFixed(1)}%)</span>
                            <span>Avg: ₹${Math.round(avgBookingValue/1000)}K</span>
                        </div>
                    </div>
                `;
            }).join('') : '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No channel data available</div>';
            
            const element = document.getElementById(targetElementId);
            if (element) {
                element.innerHTML = html;
            }
        }
        
        async function renderMonthlyTrends(reservations) {
            const monthlyData = {};
            
            reservations.forEach(r => {
                const month = r.month || new Date(r.check_in).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                if (!monthlyData[month]) {
                    monthlyData[month] = { bookings: 0, revenue: 0, nights: 0 };
                }
                monthlyData[month].bookings += 1;
                monthlyData[month].revenue += parseFloat(r.total_amount) || 0;
                monthlyData[month].nights += r.nights || 0;
            });
            
            const sortedMonths = Object.entries(monthlyData)
                .sort((a, b) => {
                    const dateA = new Date(a[0]);
                    const dateB = new Date(b[0]);
                    return dateB - dateA;
                })
                .slice(0, 6)
                .reverse();
            
            // Get properties ONCE before the loop
            const properties = await db.getProperties();
            const monthlyTargetNights = properties.length * TARGET_OCCUPANCY_NIGHTS / 12;
            
            const rows = sortedMonths.map(([month, data]) => {
                const occRate = monthlyTargetNights > 0 ? ((data.nights / monthlyTargetNights) * 100).toFixed(1) : 0;
                
                // Calculate Hostizzy revenue for this month
                const monthReservations = reservations.filter(r => r.month === month);
                const hostizzyRev = monthReservations.reduce((sum, r) => sum + (parseFloat(r.hostizzy_revenue) || 0), 0);
                const collected = monthReservations.reduce((sum, r) => sum + (parseFloat(r.paid_amount) || 0), 0);
                const pending = data.revenue - collected;
                
                return `
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 12px; font-weight: 600;">${month}</td>
                        <td style="text-align: center; padding: 12px;">${data.bookings}</td>
                        <td style="text-align: center; padding: 12px;">${data.nights}</td>
                        <td style="text-align: center; padding: 12px; font-weight: 600; color: ${occRate >= 50 ? 'var(--success)' : 'var(--warning)'};">${occRate}%</td>
                        <td style="text-align: right; padding: 12px; font-weight: 700; color: var(--success);">₹${(data.revenue/100000).toFixed(1)}L</td>
                        <td style="text-align: right; padding: 12px; color: var(--primary);">₹${(hostizzyRev/100000).toFixed(1)}L</td>
                        <td style="text-align: right; padding: 12px; color: var(--success);">₹${(collected/100000).toFixed(1)}L</td>
                        <td style="text-align: right; padding: 12px; color: var(--danger);">₹${(pending/100000).toFixed(1)}L</td>
                    </tr>
                `;
            }).join('');
            
            const html = `
                <table style="width: 100%;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border);">
                            <th style="text-align: left; padding: 12px;">Month</th>
                            <th style="text-align: center; padding: 12px;">Bookings</th>
                            <th style="text-align: center; padding: 12px;">Nights</th>
                            <th style="text-align: center; padding: 12px;">Occ %</th>
                            <th style="text-align: right; padding: 12px;">Revenue</th>
                            <th style="text-align: right; padding: 12px;">Hostizzy</th>
                            <th style="text-align: right; padding: 12px;">Collected</th>
                            <th style="text-align: right; padding: 12px;">Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
            
            document.getElementById('monthlyTrends').innerHTML = html || '<div style="text-align: center; color: var(--text-secondary);">No data available</div>';
        }

        // Payment Reminders - Simplified Version with Collapse
        function renderPaymentReminders(reservations) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get all reservations with pending/partial payments
            const pendingPayments = reservations.filter(r => {
                const checkInDate = new Date(r.check_in);
                checkInDate.setHours(0, 0, 0, 0);
                // Calculate balance based on booking source
                const total = parseFloat(r.total_amount) || 0;
                const paid = parseFloat(r.paid_amount) || 0;
                const otaFee = parseFloat(r.ota_service_fee) || 0;
                const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                
                return balance > 1 && // More than ₹1 balance (tolerance)
                    r.status !== 'cancelled' &&
                    checkInDate >= today; // Only upcoming or today
            }).sort((a, b) => new Date(a.check_in) - new Date(b.check_in));

            const reminderCard = document.getElementById('paymentRemindersCard');
            const remindersList = document.getElementById('paymentRemindersList');
            const remindersCount = document.getElementById('paymentRemindersCount');
            
            if (pendingPayments.length === 0) {
                reminderCard.style.display = 'none';
                return;
            }

            reminderCard.style.display = 'block';
            
            // Keep expanded by default
            remindersList.style.display = 'block';
            document.getElementById('paymentRemindersIcon').textContent = '🔽';
            
            const totalPending = pendingPayments.reduce((sum, r) => 
                sum + ((parseFloat(r.total_amount) || 0) - (parseFloat(r.paid_amount) || 0)), 0
            );
            
            // Update count in header
            remindersCount.textContent = `${pendingPayments.length} pending • ₹${Math.round(totalPending).toLocaleString('en-IN')} due`;

            const html = `
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #f59e0b;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 700; color: #92400e; margin-bottom: 4px;">
                                ⚠️ ${pendingPayments.length} Pending Payment${pendingPayments.length > 1 ? 's' : ''}
                            </div>
                            <div style="font-size: 14px; color: #78350f;">
                                Total Due: ₹${Math.round(totalPending).toLocaleString('en-IN')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="display: grid; gap: 12px; padding: 0 16px 16px 16px;">
                    ${pendingPayments.map(r => {
                        const checkInDate = new Date(r.check_in);
                        const daysUntilCheckIn = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
                        const total = parseFloat(r.total_amount) || 0;
                        const paid = parseFloat(r.paid_amount) || 0;
                        const otaFee = parseFloat(r.ota_service_fee) || 0;
                        const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                        const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                        const isUrgent = daysUntilCheckIn <= 3;
                        
                        return `
                            <div style="background: ${isUrgent ? '#fee2e2' : 'white'}; border: 1px solid ${isUrgent ? '#fca5a5' : 'var(--border)'}; border-radius: 8px; padding: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                <div style="flex: 1; min-width: 200px;">
                                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                        ${isUrgent ? '<span style="background: var(--danger); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">URGENT</span>' : ''}
                                        <strong style="font-size: 15px;">${r.booking_id}</strong>
                                    </div>
                                    <div style="font-size: 14px; color: var(--text); margin-bottom: 4px;">
                                        👤 ${r.guest_name}
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-secondary);">
                                        🏠 ${r.property_name} • 📅 ${formatDate(r.check_in)} ${daysUntilCheckIn === 0 ? '(Today)' : `(${daysUntilCheckIn} ${daysUntilCheckIn === 1 ? 'day' : 'days'})`}
                                    </div>
                                </div>
                                
                                <div style="text-align: right;">
                                    <div style="font-size: 20px; font-weight: 700; color: var(--danger); margin-bottom: 8px;">
                                        ₹${Math.round(balance).toLocaleString('en-IN')}
                                    </div>
                                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                                        <button class="btn btn-success btn-sm" onclick="openPaymentModal('${r.booking_id}')" title="Collect Payment">
                                            💰 Collect
                                        </button>
                                        <button class="btn btn-primary btn-sm" onclick="sendWhatsAppReminder('${r.booking_id}')" title="Send WhatsApp Reminder">
                                            📱 Remind
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            remindersList.innerHTML = html;
        }

        // Toggle Payment Reminders Collapse
        function togglePaymentReminders() {
            const content = document.getElementById('paymentRemindersList');
            const icon = document.getElementById('paymentRemindersIcon');
            const card = document.getElementById('paymentRemindersCard');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '🔽';
                card.classList.remove('collapsed');
            } else {
                content.style.display = 'none';
                icon.textContent = '▶️';
                card.classList.add('collapsed');
            }
        }

        function toggleAllPaymentReminders(checkbox) {
            document.querySelectorAll('.reminder-checkbox').forEach(cb => {
                cb.checked = checkbox.checked;
            });
            
            // Sync both checkboxes
            const headerCheckbox = document.getElementById('selectAllRemindersHeader');
            const summaryCheckbox = document.getElementById('selectAllPaymentReminders');
            if (headerCheckbox && summaryCheckbox) {
                headerCheckbox.checked = checkbox.checked;
                summaryCheckbox.checked = checkbox.checked;
            }
        }

        // Action Center Functions
        let currentActionTab = 'urgent';

        function switchActionTab(tab) {
            currentActionTab = tab;
            
            // Update tab buttons
            document.getElementById('urgentTab').style.background = tab === 'urgent' ? 'var(--danger)' : 'var(--secondary)';
            document.getElementById('todayTab').style.background = tab === 'today' ? 'var(--warning)' : 'var(--secondary)';
            document.getElementById('upcomingTab').style.background = tab === 'upcoming' ? 'var(--success)' : 'var(--secondary)';
            
            // Show/hide content
            document.getElementById('urgentActions').style.display = tab === 'urgent' ? 'block' : 'none';
            document.getElementById('todayActions').style.display = tab === 'today' ? 'block' : 'none';
            document.getElementById('upcomingActions').style.display = tab === 'upcoming' ? 'block' : 'none';
        }

        function renderActionCenter(reservations) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            
            // Categorize actions
            const urgentActions = [];
            const todayActions = [];
            const upcomingActions = [];
            
            // Calculate date range for Action Center (future + current month + past month only)
            const showAllCheckbox = document.getElementById('actionCenterShowAll');
            const showAll = showAllCheckbox ? showAllCheckbox.checked : false;
            const oneMonthAgo = new Date(today);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            oneMonthAgo.setHours(0, 0, 0, 0);

            reservations.forEach(r => {
                if (r.status === 'cancelled') return;
                
                const checkInDate = new Date(r.check_in);
                checkInDate.setHours(0, 0, 0, 0);
                
                const checkOutDate = new Date(r.check_out);
                checkOutDate.setHours(0, 0, 0, 0);
                
                // Calculate balance based on booking source
                const total = parseFloat(r.total_amount) || 0;
                const paid = parseFloat(r.paid_amount) || 0;
                const otaFee = parseFloat(r.ota_service_fee) || 0;
                const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                
                // Skip reservations older than 1 month ONLY if "Show all" is NOT enabled
                if (!showAll && checkInDate < oneMonthAgo) return;
                
                // URGENT: Overdue payments (only from past month onwards)
                if (balance > 0 && checkInDate < today) {
                    urgentActions.push({
                        type: 'overdue_payment',
                        priority: 1,
                        reservation: r,
                        title: `💸 Overdue Payment - ${r.guest_name}`,
                        details: `₹${Math.round(balance).toLocaleString('en-IN')} ${isOTA ? 'net payout' : 'pending'} • Check-in was ${formatDate(r.check_in)}`,
                        badge: 'overdue',
                        bookingId: r.booking_id
                    });
                }
                
                // URGENT: Check-ins today with pending payment
                if (checkInDate.getTime() === today.getTime() && balance > 0) {
                    urgentActions.push({
                        type: 'checkin_payment',
                        priority: 2,
                        reservation: r,
                        title: `🏨 Check-in Today - Payment Due`,
                        details: `${r.guest_name} • ${r.property_name} • ₹${Math.round(balance).toLocaleString('en-IN')} pending`,
                        badge: 'due-today',
                        bookingId: r.booking_id
                    });
                }
                
                // TODAY: Check-ins
                if (checkInDate.getTime() === today.getTime()) {
                    todayActions.push({
                        type: 'checkin',
                        reservation: r,
                        title: `🏨 Check-in: ${r.guest_name}`,
                        details: `${r.property_name} • ${r.adults + r.kids} guests • ${r.nights} nights`,
                        badge: r.payment_status === 'paid' ? 'paid' : 'due-today',
                        bookingId: r.booking_id
                    });
                }
                
                // TODAY: Check-outs
                if (checkOutDate.getTime() === today.getTime()) {
                    todayActions.push({
                        type: 'checkout',
                        reservation: r,
                        title: `🚪 Check-out: ${r.guest_name}`,
                        details: `${r.property_name} • Final amount: ₹${Math.round(r.total_amount).toLocaleString('en-IN')}`,
                        badge: r.payment_status === 'paid' ? 'paid' : 'due-today',
                        bookingId: r.booking_id
                    });
                }
                
                // UPCOMING: Check-ins in next 7 days
                if (checkInDate > today && checkInDate <= nextWeek) {
                    const daysUntil = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
                    upcomingActions.push({
                        type: 'upcoming_checkin',
                        reservation: r,
                        title: `📅 Check-in in ${daysUntil} day${daysUntil > 1 ? 's' : ''}: ${r.guest_name}`,
                        details: `${r.property_name} • ${formatDate(r.check_in)} • ${r.payment_status === 'paid' ? '✅ Paid' : '⏳ Payment pending'}`,
                        badge: 'due-soon',
                        bookingId: r.booking_id,
                        daysUntil: daysUntil
                    });
                }
            });
            
            // Sort by priority
            urgentActions.sort((a, b) => a.priority - b.priority);
            upcomingActions.sort((a, b) => a.daysUntil - b.daysUntil);
            
            // Update counts
            document.getElementById('urgentCount').textContent = urgentActions.length;
            document.getElementById('todayCount').textContent = todayActions.length;
            document.getElementById('upcomingCount').textContent = upcomingActions.length;
            
            // Update badges
            const urgentBadge = document.getElementById('urgentBadge');
            if (urgentBadge) urgentBadge.textContent = urgentActions.length;
            
            const totalBadge = document.getElementById('actionCenterTotalBadge');
            if (totalBadge) totalBadge.textContent = urgentActions.length + todayActions.length + upcomingActions.length;
            
            // Show/hide Action Center
            const totalActions = urgentActions.length + todayActions.length + upcomingActions.length;
            const actionCenterCard = document.getElementById('actionCenterCard');
            if (totalActions > 0) {
                actionCenterCard.style.display = 'block';
            } else {
                actionCenterCard.style.display = 'none';
            }
            
            // Auto-collapse overdue section if more than 5 items
            const urgentList = document.getElementById('urgentActionsList');
            const overdueIcon = document.getElementById('overdueToggleIcon');
            if (urgentActions.length > 5 && urgentList && overdueIcon) {
                urgentList.style.display = 'none';
                overdueIcon.textContent = '▶️';
            }
            
            // Render each tab
                renderActionList('urgentActionsList', urgentActions, 'urgent');
                renderActionList('todayActionsList', todayActions, 'today');
                renderActionList('upcomingActionsList', upcomingActions, 'upcoming');
            }

            function renderActionList(elementId, actions, type) {
                const element = document.getElementById(elementId);
                
                if (actions.length === 0) {
                    element.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            ${type === 'urgent' ? '✅ No urgent actions!' : 
                            type === 'today' ? '📅 No activities today' : 
                            '🎯 Nothing scheduled for next 7 days'}
                        </div>
                    `;
                    return;
                }
                
                element.innerHTML = actions.map(action => `
                    <div class="action-item ${type}">
                        <div class="action-info">
                            <div class="action-title">
                                ${action.title}
                                <span style="background: var(--background); padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-left: 8px; font-weight: 500;">${action.bookingId}</span>
                            </div>
                            <div class="action-details">
                                ${action.details}
                                ${action.badge ? `<span class="action-badge ${action.badge}" style="margin-left: 8px;">${action.badge.replace('_', ' ')}</span>` : ''}
                            </div>
                        </div>
                        <div class="action-buttons">
                            ${action.type.includes('payment') || action.type === 'checkin_payment' || action.type === 'overdue_payment' ? 
                                `<button class="btn btn-success btn-sm" onclick="openPaymentModal('${action.bookingId}')" title="Collect Payment">
                                    💰 Collect
                                </button>` : ''}
                            <button class="btn btn-primary btn-sm" onclick="sendWhatsAppReminder('${action.bookingId}')" title="Send WhatsApp">
                                📱 WhatsApp
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="viewBookingDetails('${action.bookingId}')" title="View Details">
                                👁️ View
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            function sendWhatsAppReminder(bookingId) {
                const reservation = allReservations.find(r => r.booking_id === bookingId);
                if (!reservation) {
                    showToast('Error', 'Reservation not found', '❌');
                    return;
                }
                
                const total = parseFloat(reservation.total_amount) || 0;
                const paid = parseFloat(reservation.paid_amount) || 0;
                const otaFee = parseFloat(reservation.ota_service_fee) || 0;
                const isOTA = reservation.booking_source && reservation.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                const phone = reservation.guest_phone.replace(/[^0-9]/g, '');
                
                let message = `Hello ${reservation.guest_name}!\n\n`;
                message += `This is a reminder for your booking at ${reservation.property_name}\n`;
                message += `Booking ID: ${reservation.booking_id}\n`;
                message += `Check-in: ${formatDate(reservation.check_in)}\n`;
                message += `Check-out: ${formatDate(reservation.check_out)}\n\n`;
                
                if (balance > 0) {
                    message += `Pending Payment: ₹${Math.round(balance).toLocaleString('en-IN')}\n\n`;
                }
                
                message += `Looking forward to hosting you!\n- Hostizzy Team`;
                
                const whatsappUrl = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
                window.open(whatsappUrl, '_blank');
                
                showToast('WhatsApp Opened', 'Message template ready to send', '✅');
            }

            function viewBookingDetails(bookingId) {
                showView('reservations');
                
                // Filter to show only this booking
                const searchInput = document.getElementById('searchReservations');
                searchInput.value = bookingId;
                filterReservations();
                
                showToast('Booking Found', `Showing details for ${bookingId}`, '👁️');
            }
            function toggleOverdueActions(event) {
                const list = document.getElementById('urgentActionsList');
                const icon = document.getElementById('overdueToggleIcon');
                
                if (list.style.display === 'none') {
                    list.style.display = 'block';
                    icon.textContent = '🔽';
                } else {
                    list.style.display = 'none';
                    icon.textContent = '▶️';
                }
            }
            function toggleActionCenterRange() {
                const showAll = document.getElementById('actionCenterShowAll').checked;
                
                if (showAll) {
                    showToast('Action Center', 'Showing all historical data', 'ℹ️');
                } else {
                    showToast('Action Center', 'Showing last 30 days only', 'ℹ️');
                }
                
                // Re-render Action Center with all reservations (not just confirmed)
                // This will now show all historical data when checkbox is enabled
                renderActionCenter(allReservations);
            }

        // Bulk Payment Collection
        function openBulkPaymentModal() {
            const selectedCheckboxes = document.querySelectorAll('.reminder-checkbox:checked');
            if (selectedCheckboxes.length === 0) {
                showToast('No Selection', 'Please select bookings to collect payment', '⚠️');
                return;
            }

            const bookingIds = Array.from(selectedCheckboxes).map(cb => cb.getAttribute('data-booking-id'));
            const selectedBookings = allReservations.filter(r => bookingIds.includes(r.booking_id));
            
            let totalDue = 0;
            const listHTML = selectedBookings.map(r => {
                const total = parseFloat(r.total_amount) || 0;
                const paid = parseFloat(r.paid_amount) || 0;
                const otaFee = parseFloat(r.ota_service_fee) || 0;
                const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                totalDue += balance;
                return `
                    <div style="padding: 12px; background: var(--background); border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 600;">${r.booking_id} - ${r.guest_name}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">${r.property_name} • ${formatDate(r.check_in)}</div>
                        </div>
                        <div style="font-weight: 700; color: var(--danger);">₹${Math.round(balance).toLocaleString('en-IN')}</div>
                    </div>
                `;
            }).join('');

            document.getElementById('bulkPaymentCount').textContent = selectedBookings.length;
            document.getElementById('bulkTotalDue').textContent = '₹' + Math.round(totalDue).toLocaleString('en-IN');
            document.getElementById('bulkPaymentList').innerHTML = listHTML;
            document.getElementById('bulkPaymentDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('bulkPaymentMethod').value = '';
            document.getElementById('bulkPaymentRecipient').value = '';
            document.getElementById('bulkPaymentRecipientGroup').style.display = 'none';
            document.getElementById('bulkPaymentNotes').value = '';

            // Store selected booking IDs
            window.bulkPaymentBookings = selectedBookings;

            document.getElementById('bulkPaymentModal').classList.add('active');
        }

        function closeBulkPaymentModal() {
            document.getElementById('bulkPaymentModal').classList.remove('active');
            window.bulkPaymentBookings = null;
        }

        function toggleBulkRecipientField() {
            const method = document.getElementById('bulkPaymentMethod').value;
            const recipientGroup = document.getElementById('bulkPaymentRecipientGroup');
            const recipientSelect = document.getElementById('bulkPaymentRecipient');
            
            if (method === 'cash' || method === 'upi' || method === 'bank_transfer') {
                recipientGroup.style.display = 'block';
                recipientSelect.required = true;
            } else {
                recipientGroup.style.display = 'none';
                recipientSelect.required = false;
                recipientSelect.value = '';
            }
        }

        async function saveBulkPayments() {
            if (!window.bulkPaymentBookings || window.bulkPaymentBookings.length === 0) {
                showToast('Error', 'No bookings selected', '❌');
                return;
            }

            const method = document.getElementById('bulkPaymentMethod').value;
            const date = document.getElementById('bulkPaymentDate').value;
            const notes = document.getElementById('bulkPaymentNotes').value;

            if (!method || !date) {
                showToast('Validation Error', 'Please fill all required fields', '❌');
                return;
            }

            const recipientGroup = document.getElementById('bulkPaymentRecipientGroup');
            if (recipientGroup.style.display !== 'none') {
                const recipient = document.getElementById('bulkPaymentRecipient').value;
                if (!recipient) {
                    showToast('Validation Error', 'Please select payment recipient', '❌');
                    return;
                }
            }

            const recipient = document.getElementById('bulkPaymentRecipient').value || null;

            try {
                let successCount = 0;
                for (const booking of window.bulkPaymentBookings) {
                    const balance = (parseFloat(booking.total_amount) || 0) - (parseFloat(booking.paid_amount) || 0);
                    
                    if (balance <= 0) continue;

                    const payment = {
                        booking_id: booking.booking_id,
                        payment_date: date,
                        amount: balance,
                        payment_method: method,
                        payment_recipient: recipient,
                        reference_number: null,
                        notes: notes || `Bulk payment collection`,
                        created_by: currentUser?.id || null
                    };

                    if (navigator.onLine) {
                        await db.savePayment(payment);
                        await recalculatePaymentStatus(booking.booking_id);
                    } else {
                        await saveToOfflineDB('pendingPayments', payment);
                    }
                    
                    successCount++;
                }

                closeBulkPaymentModal();
                await loadDashboard();
                await loadPayments();
                await loadReservations();
                
                showToast('Success', `Collected payments for ${successCount} bookings`, '✅');
                
                // Clear checkboxes
                document.querySelectorAll('.reminder-checkbox').forEach(cb => cb.checked = false);
                if (document.getElementById('selectAllReminders')) {
                    document.getElementById('selectAllReminders').checked = false;
                }

            } catch (error) {
                console.error('Bulk payment error:', error);
                showToast('Error', 'Failed to save payments: ' + error.message, '❌');
            }
        }

         // Reservations
        async function loadReservations() {
            try {
                allReservations = await db.getReservations();
                const properties = await db.getProperties();
                
                const propertySelect = document.getElementById('propertySelect');
                propertySelect.innerHTML = '<option value="">Select Property</option>' + 
                    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                
                // Populate property filter
                const propertyFilter = document.getElementById('propertyFilter');
                propertyFilter.innerHTML = '<option value="">All Properties</option>' + 
                    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                
                // Populate month filter with unique months from reservations
                const months = [...new Set(allReservations.map(r => r.month).filter(Boolean))].sort().reverse();
                const monthFilter = document.getElementById('monthFilter');
                monthFilter.innerHTML = '<option value="">All Months</option>' + 
                    months.map(m => `<option value="${m}">${m}</option>`).join('');
                
                displayReservations(allReservations);
                
                // Restore saved filters
                setTimeout(() => {
                    const savedFilters = loadFilterState('reservations');
                    if (savedFilters) {
                        console.log('🔄 Restoring reservation filters:', savedFilters);
                        
                        // Restore each filter
                        if (savedFilters.search) {
                            const searchInput = document.getElementById('searchReservations');
                            if (searchInput) searchInput.value = savedFilters.search;
                        }
                        if (savedFilters.status) {
                            const statusFilter = document.getElementById('statusFilter');
                            if (statusFilter) statusFilter.value = savedFilters.status;
                        }
                        if (savedFilters.property) {
                            const propertyFilter = document.getElementById('propertyFilter');
                            if (propertyFilter) propertyFilter.value = savedFilters.property;
                        }
                        if (savedFilters.bookingSource) {
                            const sourceFilter = document.getElementById('bookingSourceFilter');
                            if (sourceFilter) sourceFilter.value = savedFilters.bookingSource;
                        }
                        if (savedFilters.month) {
                            const monthFilter = document.getElementById('monthFilter');
                            if (monthFilter) monthFilter.value = savedFilters.month;
                        }
                        
                        // Apply the filters
                        setTimeout(() => filterReservations(), 200);
                    }
                }, 500);
            } catch (error) {
                console.error('Reservations error:', error);
                showToast('Error', 'Failed to load reservations', '❌');
            }
        }

        function displayReservations(reservations) {
            const tbody = document.getElementById('reservationsTableBody');
            if (reservations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" class="text-center">No reservations found</td></tr>';
                return;
            }
            
            tbody.innerHTML = reservations.map(r => `
                <tr>
                    <td>
                        <input type="checkbox" class="row-select-checkbox" data-booking-id="${r.booking_id}" 
                               onchange="toggleRowSelection(this, '${r.booking_id}')">
                    </td>
                    <td><strong>${r.booking_id || 'N/A'}</strong></td>
                    <td>${r.property_name}</td>
                    <td>
                        ${getBookingSourceBadge(r.booking_source)}
                    </td>
                    <td>${r.guest_name}</td>
                    <td>${formatDate(r.check_in)}</td>
                    <td>${r.nights}</td>
                    <td>
                        <div style="font-weight: 700; font-size: 15px;">
                            ${formatCurrency(r.total_amount)}
                        </div>
                        ${r.ota_service_fee > 0 ? `
                            <div style="font-size: 11px; color: var(--danger); margin-top: 2px;">
                                🏢 Fee: ${formatCurrency(r.ota_service_fee)}
                            </div>
                            <div style="font-size: 11px; color: var(--success); margin-top: 2px; font-weight: 600;">
                                Net: ${formatCurrency(r.total_amount - r.ota_service_fee)}
                            </div>
                        ` : ''}
                    </td>
                    <td><span class="badge badge-${r.status}">${r.status}</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="openPaymentModal('${r.booking_id}')" title="Add Payments">💰</button>
                        <button class="btn btn-success btn-sm" onclick="viewPaymentHistory('${r.booking_id}')" title="View Payments">📜</button>
                        <button class="btn btn-success btn-sm" onclick="openWhatsAppMenu('${r.booking_id}')" title="Send WhatsApp">📱</button>
                        <button class="btn btn-secondary btn-sm" onclick="editReservation('${r.booking_id}')" title="Edit Reservation">📝</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteReservation('${r.booking_id}')">×</button>
                    </td>
                </tr>
            `).join('');
        }

        // Store filtered reservations for CSV export
        let filteredReservationsForExport = [];

        function filterReservations() {
            const search = document.getElementById('searchReservations').value.toLowerCase();
            const status = document.getElementById('statusFilter').value;
            const property = document.getElementById('propertyFilter').value;
            const bookingSource = document.getElementById('bookingSourceFilter').value;
            const month = document.getElementById('monthFilter').value;
            
            filteredReservationsForExport = allReservations.filter(r => {
                const matchesSearch = !search || 
                    (r.guest_name || '').toLowerCase().includes(search) ||
                    (r.booking_id || '').toLowerCase().includes(search) ||
                    (r.guest_phone || '').toLowerCase().includes(search) ||
                    (r.property_name || '').toLowerCase().includes(search);
                
                const matchesStatus = !status || r.status === status;
                const matchesProperty = !property || r.property_id == property;
                const matchesBookingSource = !bookingSource || r.booking_source === bookingSource;
                
                let matchesMonth = true;
                if (month) {
                matchesMonth = r.month === month;
                }
                
                return matchesSearch && matchesStatus && matchesProperty && matchesBookingSource && matchesMonth;
            });
            
            displayReservations(filteredReservationsForExport);
            // Save filter state
            saveFilterState('reservations', {
                search: document.getElementById('searchReservations').value,
                status: document.getElementById('statusFilter').value,
                property: document.getElementById('propertyFilter').value,
                bookingSource: document.getElementById('bookingSourceFilter').value,
                month: document.getElementById('monthFilter').value
            });
        }

        function clearFilters() {
            document.getElementById('searchReservations').value = '';
            document.getElementById('statusFilter').value = '';
            document.getElementById('propertyFilter').value = '';
            document.getElementById('bookingSourceFilter').value = '';
            document.getElementById('monthFilter').value = '';
            filteredReservationsForExport = [];
            displayReservations(allReservations);

            // Clear saved filter state
            clearFilterState('reservations');
            showToast('Filters Cleared', 'Showing all reservations', 'ℹ️');
        }

        function toggleReservationCodeField() {
            const bookingSource = document.getElementById('bookingSource').value;
            const reservationCodeRow = document.getElementById('reservationCodeRow');
            const reservationCodeInput = document.getElementById('reservationCode');
            
            // Show field for OTA bookings
            const otaSources = ['AIRBNB', 'AGODA/BOOKING.COM', 'MMT/GOIBIBO'];
            
            if (otaSources.includes(bookingSource)) {
                reservationCodeRow.style.display = 'flex';
                reservationCodeInput.required = true;
            } else {
                reservationCodeRow.style.display = 'none';
                reservationCodeInput.required = false;
                reservationCodeInput.value = ''; // Clear value when hidden
            }
        }

        // Show/hide OTA service fee field based on booking source
        function toggleOtaServiceFeeField() {
            const bookingSource = document.getElementById('bookingSource').value;
            const otaServiceFeeGroup = document.getElementById('otaServiceFeeGroup');
            const otaServiceFeeInput = document.getElementById('otaServiceFee');
            
            const otaSources = ['AIRBNB', 'AGODA/BOOKING.COM', 'MMT/GOIBIBO'];
            
            if (otaSources.includes(bookingSource)) {
                otaServiceFeeGroup.style.display = 'block';
            } else {
                otaServiceFeeGroup.style.display = 'none';
                otaServiceFeeInput.value = '0';
            }
        }
    // ============================================
    // WHATSAPP AUTOMATION FUNCTIONS
    // ============================================

        window.generateWhatsAppLink = function(booking, template = 'booking_confirmation', customMessage = null) {
            // Clean phone number (remove spaces, dashes, etc.)
            let phone = (booking.guest_phone || '').replace(/[^0-9]/g, '');
            
            // Add country code if not present
            if (!phone.startsWith('91') && phone.length === 10) {
                phone = '91' + phone;
            }
            
            // Generate message from template
            const message = customMessage || whatsappTemplates[template](booking);
            
            // Encode for URL
            const encodedMessage = encodeURIComponent(message);
            
            // Return WhatsApp Web/App link
            return `https://wa.me/${phone}?text=${encodedMessage}`;
        };

        window.sendWhatsAppMessage = async function(booking_id, template = 'booking_confirmation', customMessage = null) {
            try {
                console.log('sendWhatsAppMessage called:', booking_id, template);
                
                // Get booking data
                const booking = allReservations.find(r => r.booking_id === booking_id);
                
                if (!booking) {
                    showToast('Error', 'Booking not found', '❌');
                    return;
                }
                
                if (!booking.guest_phone) {
                    showToast('Error', 'Guest phone number not available', '❌');
                    return;
                }
                
                // Generate WhatsApp link
                const whatsappUrl = generateWhatsAppLink(booking, template, customMessage);
                console.log('WhatsApp URL:', whatsappUrl);
                
                // Open WhatsApp in new tab
                window.open(whatsappUrl, '_blank');
                
                // Log communication
                const message = customMessage || whatsappTemplates[template](booking);
                await logCommunication({
                    booking_id: booking_id,
                    guest_name: booking.guest_name,
                    guest_phone: booking.guest_phone,
                    message_type: 'whatsapp',
                    template_used: template,
                    message_content: message,
                    sent_by: currentUser?.email || 'system'
                });
                
                // Show success notification
                showToast('WhatsApp Opened', `Message ready for ${booking.guest_name}`, '📱');
                
                // Haptic feedback
                if ('vibrate' in navigator) {
                    navigator.vibrate([10, 50, 10]);
                }
                
            } catch (error) {
                console.error('WhatsApp error:', error);
                showToast('Error', 'Failed to open WhatsApp: ' + error.message, '❌');
            }
        };

        window.logCommunication = async function(data) {
            try {
                const { data: result, error } = await supabase
                    .from('communications')
                    .insert([data]);
                
                if (error) throw error;
                
                console.log('Communication logged:', result);
            } catch (error) {
                console.error('Error logging communication:', error);
                // Don't show error to user, just log it
            }
        };

        window.openWhatsAppMenu = function(booking_id) {
            const booking = allReservations.find(r => r.booking_id === booking_id);
            
            if (!booking) {
                showToast('Error', 'Booking not found', '❌');
                return;
            }
            
            if (!booking.guest_phone) {
                showToast('Error', 'Guest phone number not available', '❌');
                return;
            }
            
            currentWhatsAppBooking = booking;
            
            // Populate guest info
            document.getElementById('whatsappGuestName').textContent = booking.guest_name;
            document.getElementById('whatsappGuestPhone').textContent = booking.guest_phone;
            document.getElementById('whatsappBookingId').textContent = booking.booking_id;
            
            // Reset form
            const templateSelect = document.getElementById('whatsappTemplate');
            const customGroup = document.getElementById('customMessageGroup');
            const customText = document.getElementById('customMessageText');
            
            if (templateSelect) templateSelect.value = 'booking_confirmation';
            if (customGroup) customGroup.style.display = 'none';
            if (customText) customText.value = '';
            
            // Preview message
            previewWhatsAppMessage();
            
            // Load communication history
            loadCommunicationHistory(booking_id);
            
            // Show modal
            const modal = document.getElementById('whatsappModal');
            console.log('Modal element:', modal);
            
            if (modal) {
                modal.classList.add('show');
                console.log('Modal classes:', modal.className);
            } else {
                console.error('Modal element not found!');
            }
            
            console.log('=== openWhatsAppMenu END ===');
        };

        window.closeWhatsAppModal = function() {
            const modal = document.getElementById('whatsappModal');
            if (modal) {
                modal.classList.remove('show');
            }
            currentWhatsAppBooking = null;
        };

        window.previewWhatsAppMessage = function() {
            if (!currentWhatsAppBooking) {
                console.log('No current booking');
                return;
            }
            
            const template = document.getElementById('whatsappTemplate')?.value;
            const customMessageGroup = document.getElementById('customMessageGroup');
            const preview = document.getElementById('whatsappPreview');
            
            if (!template || !preview) return;
            
            if (template === 'custom') {
                if (customMessageGroup) customMessageGroup.style.display = 'block';
                const customText = document.getElementById('customMessageText')?.value;
                preview.textContent = customText || whatsappTemplates.custom(currentWhatsAppBooking);
            } else {
                if (customMessageGroup) customMessageGroup.style.display = 'none';
                preview.textContent = whatsappTemplates[template](currentWhatsAppBooking);
            }
        };

        window.confirmSendWhatsApp = function() {
            if (!currentWhatsAppBooking) {
                showToast('Error', 'No booking selected', '❌');
                return;
            }
            
            const template = document.getElementById('whatsappTemplate')?.value || 'booking_confirmation';
            let customMessage = null;
            
            if (template === 'custom') {
                customMessage = document.getElementById('customMessageText')?.value.trim();
                if (!customMessage) {
                    showToast('Error', 'Please enter a custom message', '❌');
                    return;
                }
            }
            
            sendWhatsAppMessage(currentWhatsAppBooking.booking_id, template, customMessage);
            closeWhatsAppModal();
        };

        window.loadCommunicationHistory = async function(booking_id) {
            try {
                const { data, error } = await supabase
                    .from('communications')
                    .select('*')
                    .eq('booking_id', booking_id)
                    .order('sent_at', { ascending: false })
                    .limit(10);
                
                if (error) throw error;
                
                const historyDiv = document.getElementById('communicationHistory');
                if (!historyDiv) return;
                
                if (!data || data.length === 0) {
                    historyDiv.innerHTML = '<div style="color: var(--text-secondary); font-style: italic; font-size: 13px;">No messages sent yet</div>';
                    return;
                }
                
                historyDiv.innerHTML = data.map(comm => `
                    <div style="padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 4px;">
                            <span style="font-weight: 600; font-size: 13px;">📱 ${getTemplateLabel(comm.template_used)}</span>
                            <span style="font-size: 11px; color: var(--text-secondary);">${formatDateTime(comm.sent_at)}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Sent by: ${comm.sent_by || 'Unknown'}
                        </div>
                    </div>
                `).join('');
                
            } catch (error) {
                console.error('Error loading history:', error);
                const historyDiv = document.getElementById('communicationHistory');
                if (historyDiv) {
                    historyDiv.innerHTML = '<div style="color: var(--danger); font-size: 13px;">Failed to load history</div>';
                }
            }
        };

        window.getTemplateLabel = function(template) {
            const labels = {
                'booking_confirmation': 'Booking Confirmation',
                'payment_reminder': 'Payment Reminder',
                'check_in_instructions': 'Check-in Instructions',
                'thank_you': 'Thank You Message',
                'custom': 'Custom Message'
            };
            return labels[template] || 'Message';
        };

        window.formatDateTime = function(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
 

        // Reservation Modal Functions
        function openReservationModal(booking_id = null) {
            const modal = document.getElementById('reservationModal');
            if (booking_id) {
                const r = allReservations.find(res => res.booking_id === booking_id);
                if (!r) {
                    showToast('Error', 'Reservation not found', '❌');
                    return;
                }
                document.getElementById('reservationModalTitle').textContent = 'Edit Reservation';
                document.getElementById('editReservationId').value = r.id;
                document.getElementById('propertySelect').value = r.property_id;
                document.getElementById('bookingStatus').value = r.status;
                document.getElementById('bookingType').value = r.booking_type || 'STAYCATION';
                document.getElementById('checkInDate').value = r.check_in;
                document.getElementById('checkOutDate').value = r.check_out;
                document.getElementById('guestName').value = r.guest_name;
                document.getElementById('guestPhone').value = r.guest_phone;
                document.getElementById('guestEmail').value = r.guest_email || '';
                document.getElementById('guestCity').value = r.guest_city || '';
                document.getElementById('bookingSource').value = r.booking_source || 'DIRECT';
                document.getElementById('numberOfRooms').value = r.number_of_rooms || 1;
                document.getElementById('adults').value = r.adults || 2;
                document.getElementById('kids').value = r.kids || 0;
                document.getElementById('stayAmount').value = r.stay_amount || 0;
                document.getElementById('extraGuestCharges').value = r.extra_guest_charges || 0;
                document.getElementById('mealsChef').value = r.meals_chef || 0;
                document.getElementById('bonfireOther').value = r.bonfire_other || 0;
                document.getElementById('taxes').value = r.taxes || 0;
                document.getElementById('damages').value = r.damages || 0;
                document.getElementById('hostizzyRevenue').value = r.hostizzy_revenue || 0;
                document.getElementById('otaServiceFee').value = r.ota_service_fee || 0;
                toggleOtaServiceFeeField();
                //Recalculate Hostizzy Revenue for edits
                setTimeout(() => {
                    calculateHostizzyRevenue(parseFloat(r.stay_amount) || 0, parseFloat(r.extra_guest_charges) || 0);
                }, 100);
                document.getElementById('gstStatus').value = r.gst_status || 'gst';
            } else {
                document.getElementById('reservationModalTitle').textContent = 'New Reservation';
                document.getElementById('editReservationId').value = '';
                document.querySelectorAll('#reservationModal input, #reservationModal select').forEach(el => {
                    if (el.type === 'number') el.value = el.id === 'adults' ? 2 : (el.id === 'numberOfRooms' ? 1 : 0);
                    else if (el.type !== 'hidden') el.value = '';
                });
                document.getElementById('bookingStatus').value = 'pending';
                document.getElementById('bookingSource').value = 'DIRECT';
                document.getElementById('reservationCode').value = '';
                toggleReservationCodeField(); // Reset visibility
                toggleOtaServiceFeeField(); // Reset OTA fee visibility
            }
            modal.classList.add('active');
        }

        function closeReservationModal() {
            document.getElementById('reservationModal').classList.remove('active');
        }

        // Auto-calculate taxes based on per night rate
        function calculateTaxes() {
            const gstStatus = document.getElementById('gstStatus').value;
            const taxesInput = document.getElementById('taxes');
            
            // If Non-GST, clear taxes and disable field
            if (gstStatus === 'non_gst') {
                taxesInput.value = '0';
                taxesInput.style.background = '#e2e8f0';
                return;
            }
            
            // Re-enable and calculate for GST
            taxesInput.style.background = '#f1f5f9';
            
            const checkIn = document.getElementById('checkInDate').value;
            const checkOut = document.getElementById('checkOutDate').value;
            
            if (!checkIn || !checkOut) return;
            
            const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
            if (nights <= 0) return;
            
            const stayAmount = parseFloat(document.getElementById('stayAmount').value) || 0;
            const extraGuestCharges = parseFloat(document.getElementById('extraGuestCharges').value) || 0;
            
            const totalAmountPreTax = stayAmount + extraGuestCharges;
            const perNightRate = totalAmountPreTax / nights;
            
            // Tax calculation: 5% if ≤7500/night, 18% if >7500/night
            let taxRate = 0;
            if (perNightRate <= 7500) {
                taxRate = 0.05; // 5%
            } else {
                taxRate = 0.18; // 18%
            }
            
            const taxes = totalAmountPreTax * taxRate;
            taxesInput.value = taxes.toFixed(2);
        
            // Auto-calculate Hostizzy Revenue
            calculateHostizzyRevenue(stayAmount, extraGuestCharges);
        }

        async function calculateHostizzyRevenue(stayAmount, extraGuestCharges) {
            try {
                const propertyId = parseInt(document.getElementById('propertySelect').value);
                if (!propertyId) {
                    document.getElementById('hostizzyRevenue').value = '0';
                    return;
                }
                
                const revenueSharePercent = await db.getRevenueSharePercent(propertyId);
                const applicableAmount = stayAmount + extraGuestCharges;
                const hostizzyRevenue = (applicableAmount * revenueSharePercent) / 100;
                
                document.getElementById('hostizzyRevenue').value = hostizzyRevenue.toFixed(2);
            } catch (error) {
                console.error('Error calculating Hostizzy Revenue:', error);
                document.getElementById('hostizzyRevenue').value = '0';
            }
        }

        async function saveReservation() {
            const propertyId = parseInt(document.getElementById('propertySelect').value);
            
            if (!propertyId) {
                showToast('Validation Error', 'Please select a property', '❌');
                return;
            }
            
        // Check online status
            if (!navigator.onLine) {
                if (!confirm('You are offline. This reservation will be saved locally and synced when you are back online. Continue?')) {
                    return;
                }
            }
            
            try {
                const properties = await db.getProperties();
                const property = properties.find(p => p.id === propertyId);
                
                if (!property) {
                    showToast('Error', 'Property not found', '❌');
                    return;
                }
                
                const checkIn = document.getElementById('checkInDate').value;
                const checkOut = document.getElementById('checkOutDate').value;
                
                if (!checkIn || !checkOut) {
                    showToast('Validation Error', 'Check-out date must be after check-in date', '❌');
                    return;
                }
                
                // Validate reservation code for OTA bookings
                const bookingSource = document.getElementById('bookingSource').value;
                const reservationCode = document.getElementById('reservationCode').value.trim();
                const otaSources = ['AIRBNB', 'AGODA/BOOKING.COM', 'MMT/GOIBIBO'];
                
                if (otaSources.includes(bookingSource) && !reservationCode) {
                    showToast('Validation Error', 'Please enter the OTA reservation code', '❌');
                    return;
                }

                // Calculate number of nights
                const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
                
                if (nights <= 0) {
                    showToast('Validation Error', 'Check-out date must be after check-in date', '❌');
                    return;
        }
                const adults = parseInt(document.getElementById('adults').value) || 0;
                const kids = parseInt(document.getElementById('kids').value) || 0;
                const numberOfGuests = adults + kids;
                
                const stayAmount = parseFloat(document.getElementById('stayAmount').value) || 0;
                const extraGuestCharges = parseFloat(document.getElementById('extraGuestCharges').value) || 0;
                const mealsChef = parseFloat(document.getElementById('mealsChef').value) || 0;
                const bonfireOther = parseFloat(document.getElementById('bonfireOther').value) || 0;
                const taxes = parseFloat(document.getElementById('taxes').value) || 0;
                const damages = parseFloat(document.getElementById('damages').value) || 0;
                
                // Meals Revenue includes both meals_chef and bonfire_other (calculated, not stored)
                const mealsRevenue = mealsChef + bonfireOther;
                const totalAmountPreTax = stayAmount + extraGuestCharges + mealsRevenue;
                const totalAmountIncTax = totalAmountPreTax + taxes;
                const totalAmount = totalAmountIncTax + damages;
                
                const avgRoomRate = nights > 0 ? stayAmount / nights : 0;
                const avgNightlyRate = nights > 0 ? totalAmount / nights : 0;
                
                const monthDate = new Date(checkIn);
                const month = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                
                const editId = document.getElementById('editReservationId').value;
                
                const reservation = {
                    property_id: propertyId,
                    property_name: property.name,
                    booking_type: document.getElementById('bookingType').value,
                    booking_date: new Date().toISOString().split('T')[0],
                    check_in: checkIn,
                    check_out: checkOut,
                    month: month,
                    nights: nights,
                    gst_status: document.getElementById('gstStatus').value,
                    taxes: document.getElementById('gstStatus').value === 'non_gst' ? 0 : 
                           parseFloat(document.getElementById('taxes').value) || 0,
                    guest_name: document.getElementById('guestName').value,
                    guest_phone: document.getElementById('guestPhone').value,
                    guest_email: document.getElementById('guestEmail').value || null,
                    guest_city: document.getElementById('guestCity').value || null,
                    status: document.getElementById('bookingStatus').value,
                    booking_source: bookingSource,
                    number_of_rooms: parseInt(document.getElementById('numberOfRooms').value) || 1,
                    adults: adults,
                    kids: kids,
                    number_of_guests: numberOfGuests,
                    stay_amount: stayAmount,
                    extra_guest_charges: extraGuestCharges,
                    meals_chef: mealsChef,
                    bonfire_other: bonfireOther,
                    ota_service_fee: parseFloat(document.getElementById('otaServiceFee').value) || 0,
                    taxes: taxes,
                    total_amount_pre_tax: totalAmountPreTax,
                    total_amount_inc_tax: totalAmountIncTax,
                    total_amount: totalAmount,
                    damages: damages,
                    hostizzy_revenue: parseFloat(document.getElementById('hostizzyRevenue').value) || 0,
                    avg_room_rate: avgRoomRate,
                    avg_nightly_rate: avgNightlyRate,
                    paid_amount: 0,
                    payment_status: 'pending'
                };
                
                // Handle booking_id for both new and edited reservations
                if (!editId) {
                    // NEW RESERVATION: Generate booking_id
                    if (otaSources.includes(bookingSource) && reservationCode) {
                        // Use OTA reservation code as booking ID
                        reservation.booking_id = reservationCode;
                    } else {
                        // Generate system booking ID for direct bookings
                        const year = new Date().getFullYear().toString().slice(-2);
                        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                        const bytes = crypto.getRandomValues(new Uint8Array(6));
                        let rand = "";
                        for (const b of bytes) {
                            rand += alphabet[b % alphabet.length];
                        }
                        reservation.booking_id = `HST${year}${rand}`;
                    }
                } else {
                    // EDITING EXISTING RESERVATION: Update booking_id if source changed to OTA
                    if (otaSources.includes(bookingSource) && reservationCode) {
                        // If changed to OTA and has OTA code, update booking_id
                        reservation.booking_id = reservationCode;
                    }
                    // Note: If source is not OTA, booking_id remains unchanged (keeps existing ID)
                }
                
                if (navigator.onLine) {
                    if (editId) {
                        reservation.id = parseInt(editId);
                    }
                    
                    const result = await db.saveReservation(reservation);
                    console.log('Saved reservation:', result);

                    // Send push notification for new bookings only (not edits)
                    if (!editId) {
                        notifyNewBooking(reservation);
                    }

                    closeReservationModal();
                    await loadReservations();
                    await loadDashboard();
                    showToast('Success', editId ? 'Reservation updated!' : 'Reservation created successfully!', '✅');
                } else {
                    await saveToOfflineDB('pendingReservations', reservation);
                    closeReservationModal();
                    await loadReservations();
                    showToast('Saved Offline', 'Will sync when online', '💾');
                }
            } catch (error) {
                console.error('Error saving reservation:', error);
                showToast('Error', 'Failed to save reservation: ' + error.message, '❌');
            }
        }

        async function editReservation(booking_id) {
            openReservationModal(booking_id);
        }

        async function deleteReservation(booking_id) {
            if (!confirm('Delete this reservation?')) return;
            
            try {
                await db.deleteReservation(booking_id);
                await loadReservations();
                await loadDashboard();
                showToast('Deleted', 'Reservation deleted successfully', '✅');
            } catch (error) {
                console.error('Delete error:', error);
                showToast('Error', 'Failed to delete reservation', '❌');
            }
        }

        // Payment Functions
        async function loadPayments() {
            try {
                allReservations = await db.getReservations();
                
                // Populate property filter dropdown
                const propertyFilter = document.getElementById('paymentPropertyFilter');
                if (propertyFilter) {
                    const uniqueProperties = [...new Set(allReservations.map(r => r.property_name))].sort();
                    propertyFilter.innerHTML = '<option value="">All Properties</option>' + 
                        uniqueProperties.map(p => `<option value="${p}">${p}</option>`).join('');
                }
                
                // Filter confirmed reservations (reuse later for reminders)
                const confirmedReservations = allReservations.filter(r => r.status !== 'cancelled');
                
                // Calculate metrics
                const totalRevenue = confirmedReservations
                    .reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                
                const totalOtaFees = confirmedReservations
                    .reduce((sum, r) => sum + (parseFloat(r.ota_service_fee) || 0), 0);
                
                const netRevenue = totalRevenue - totalOtaFees;
                
                const totalPaid = confirmedReservations
                    .reduce((sum, r) => sum + (parseFloat(r.paid_amount) || 0), 0);
                
                const totalPending = confirmedReservations
                    .reduce((sum, r) => sum + ((parseFloat(r.total_amount) || 0) - (parseFloat(r.paid_amount) || 0)), 0);
                
                // Render payment stats cards
                let statsHTML = `
                    <div class="stat-card" style="border-left-color: #8b5cf6;">
                        <div class="stat-label">Total Revenue</div>
                        <div class="stat-value">${formatCurrency(totalRevenue)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            Gross booking amount
                        </div>
                    </div>
                `;
                
                // Conditionally add OTA fees card
                if (totalOtaFees > 0) {
                    statsHTML += `
                    <div class="stat-card" style="border-left-color: #ef4444;">
                        <div class="stat-label">🏢 OTA Fees</div>
                        <div class="stat-value">${formatCurrency(totalOtaFees)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            Commission deductions
                        </div>
                    </div>
                    <div class="stat-card" style="border-left-color: #10b981;">
                        <div class="stat-label">💰 Net Revenue</div>
                        <div class="stat-value">${formatCurrency(netRevenue)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            After OTA fees
                        </div>
                    </div>
                    `;
                }
                
                statsHTML += `
                    <div class="stat-card" style="border-left-color: #10b981;">
                        <div class="stat-label">Total Collected</div>
                        <div class="stat-value">${formatCurrency(totalPaid)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            Received payments
                        </div>
                    </div>
                    <div class="stat-card" style="border-left-color: #ef4444;">
                        <div class="stat-label">Total Pending</div>
                        <div class="stat-value">${formatCurrency(totalPending)}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            Outstanding balance
                        </div>
                    </div>
                `;
                
                document.getElementById('paymentStatsGrid').innerHTML = statsHTML;
                
                // Render payment reminders
                renderPaymentReminders(confirmedReservations);
                
                displayPayments(allReservations);
            } catch (error) {
                console.error('Payments error:', error);
                showToast('Error', 'Failed to load payments', '❌');
            }
        }

        function displayPayments(reservations) {
            const tbody = document.getElementById('paymentsTableBody');
            if (reservations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center">No payment records found</td></tr>';
                return;
            }
            
            tbody.innerHTML = reservations.map(r => {
                const total = parseFloat(r.total_amount) || 0;
                const otaFee = parseFloat(r.ota_service_fee) || 0;
                const netAmount = total - otaFee;
                const paid = parseFloat(r.paid_amount) || 0;
                // Calculate balance based on booking source
                const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                // For OTA: Balance = Net Amount - Paid
                // For Direct: Balance = Total - Paid (ignore OTA fee calc)
                const balance = isOTA ? (netAmount - paid) : (total - paid);
                const status = r.payment_status || 'pending';
                
                return `
                    <tr>
                        <td>
                            <strong style="color: var(--primary); cursor: pointer; text-decoration: underline;" 
                                    onclick="navigateToReservation('${r.booking_id}')">
                                ${r.booking_id || 'N/A'}
                            </strong>
                        </td>
                        <td>${r.guest_name}</td>
                        <td>${r.property_name}</td>
                        <td>${formatDate(r.check_in)}</td>
                        <td>
                            <div style="font-weight: 600; font-size: 14px;">
                                ${formatCurrency(total, {compact: false})}
                            </div>
                            ${otaFee > 0 ? `
                                <div style="font-size: 11px; color: var(--danger); margin-top: 2px;">
                                    OTA Fee: ${formatCurrency(otaFee, {compact: false})}
                                </div>
                                <div style="font-size: 11px; color: var(--success); margin-top: 2px; font-weight: 600;">
                                    Net: ${formatCurrency(netAmount, {compact: false})}
                                </div>
                            ` : ''}
                        </td>
                        <td style="color: var(--success); font-weight: 600;">${formatCurrency(paid, {compact: false})}</td>
                        <td style="color: ${balance > 0 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">
                            ${formatCurrency(balance, {compact: false})}
                        </td>
                        <td>
                            <span class="payment-status ${status}">${status.toUpperCase()}</span>
                            ${r.booking_source && r.booking_source !== 'DIRECT' ? 
                                '<div style="font-size: 10px; color: var(--warning); margin-top: 4px;">💳 Guest Prepaid via OTA</div>' 
                                : ''}
                        </td>
                        <td>
                            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                                ${balance > 0 ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModal('${r.booking_id}')">💰 Add</button>` : ''}
                                <button class="btn btn-success btn-sm" onclick="viewPaymentHistory('${r.booking_id}')">📜 History</button>
                                ${balance > 0 ? `<button class="btn btn-success btn-sm" onclick="openWhatsAppMenu('${r.booking_id}')" title="Send Payment Reminder">📱 Remind</button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Store filtered payments for CSV export
        let filteredPayments = [];

        function filterPayments() {
            const search = document.getElementById('searchPayments').value.toLowerCase();
            const status = document.getElementById('paymentStatusFilter').value;
            const property = document.getElementById('paymentPropertyFilter').value;
            
            filteredPayments = allReservations.filter(r => {
                const matchesSearch = !search || 
                    (r.guest_name || '').toLowerCase().includes(search) ||
                    (r.booking_id || '').toLowerCase().includes(search);
                const matchesStatus = !status || r.payment_status === status;
                const matchesProperty = !property || r.property_name === property;
                return matchesSearch && matchesStatus && matchesProperty;
            });
            
            displayPayments(filteredPayments);
        }
        
        function clearPaymentFilters() {
            document.getElementById('searchPayments').value = '';
            document.getElementById('paymentStatusFilter').value = '';
            document.getElementById('paymentPropertyFilter').value = '';
            filteredPayments = [];
            displayPayments(allReservations);
            showToast('Filters Cleared', 'All filters have been reset', 'ℹ️');
        }


        // Payment Modal Functions
        async function openPaymentModal(bookingId) {
            const modal = document.getElementById('paymentModal');
            const reservation = allReservations.find(r => r.booking_id === bookingId);
            
            if (!reservation) {
                showToast('Error', 'Reservation not found', '❌');
                return;
            }
            
            const total = parseFloat(reservation.total_amount) || 0;
            const otaFee = parseFloat(reservation.ota_service_fee) || 0;
            const netAmount = total - otaFee;
            const paid = parseFloat(reservation.paid_amount) || 0;
            const isOTA = reservation.booking_source && reservation.booking_source !== 'DIRECT';
            const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
            
            let amountDisplay = formatCurrency(total, {compact: false});
            if (otaFee > 0) {
                amountDisplay += `<div style="font-size: 12px; color: var(--danger); margin-top: 4px;">OTA Fee: ${formatCurrency(otaFee, {compact: false})}</div>`;
                amountDisplay += `<div style="font-size: 12px; color: var(--success); margin-top: 4px; font-weight: 600;">Net: ${formatCurrency(netAmount, {compact: false})}</div>`;
            }
            
            document.getElementById('paymentTotalAmount').innerHTML = amountDisplay;
            document.getElementById('paymentPaidAmount').textContent = formatCurrency(paid, {compact: false});
            document.getElementById('paymentBalance').textContent = formatCurrency(balance, {compact: false});
            
            document.getElementById('paymentBookingId').value = bookingId;
            document.getElementById('editPaymentId').value = '';
            document.getElementById('paymentAmount').value = balance > 0 ? Math.round(balance) : '';
            document.getElementById('paymentDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('paymentMethod').value = '';
            document.getElementById('paymentRecipient').value = '';
            document.getElementById('paymentRecipientGroup').style.display = 'none';
            document.getElementById('paymentReference').value = '';
            document.getElementById('paymentNotes').value = '';
            
            modal.classList.add('active');
        }

        function closePaymentModal() {
            document.getElementById('paymentModal').classList.remove('active');
        }

        function toggleRecipientField() {
            const method = document.getElementById('paymentMethod').value;
            const recipientGroup = document.getElementById('paymentRecipientGroup');
            const recipientSelect = document.getElementById('paymentRecipient');
            
            if (method === 'cash' || method === 'upi' || method === 'bank_transfer') {
                recipientGroup.style.display = 'block';
                recipientSelect.required = true;
            } else {
                recipientGroup.style.display = 'none';
                recipientSelect.required = false;
                recipientSelect.value = '';
            }
        }

        /**
         * Switch from single payment modal to multi-payment modal
         */
        function switchToMultiPayment() {
            // Get data from single payment modal
            const bookingId = document.getElementById('paymentBookingId').value;
            const amount = document.getElementById('paymentAmount').value;
            const method = document.getElementById('paymentMethod').value;
            const recipient = document.getElementById('paymentRecipient').value;
            const date = document.getElementById('paymentDate').value;
            const notes = document.getElementById('paymentNotes').value;
            
            // Close single payment modal
            closePaymentModal();
            
            // Find reservation details
            const reservation = allReservations.find(r => r.booking_id === bookingId);
            
            if (!reservation) {
                showToast('Error', 'Reservation not found', '❌');
                return;
            }
            
            // Open multi-payment modal
            const modal = document.getElementById('multiPaymentModal');
            const title = modal.querySelector('.modal-title');
            
            title.innerHTML = `💰 Add Multiple Payments - ${reservation.guest_name}`;
            
            // Initialize with 2 rows
            multiPaymentRows = [];
            addPaymentRow();
            addPaymentRow();
            
            modal.classList.add('active');
            
            // Pre-fill first row with data from single payment modal
            setTimeout(() => {
                if (multiPaymentRows.length > 0) {
                    const firstRow = multiPaymentRows[0];
                    
                    document.getElementById(`bookingId_${firstRow.id}`).value = bookingId;
                    document.getElementById(`guestName_${firstRow.id}`).value = reservation.guest_name;
                    document.getElementById(`date_${firstRow.id}`).value = date || new Date().toISOString().split('T')[0];
                    
                    if (amount) {
                        document.getElementById(`amount_${firstRow.id}`).value = amount;
                    }
                    
                    if (method) {
                        document.getElementById(`method_${firstRow.id}`).value = method;
                        handleMethodChange(firstRow.id);
                        
                        if (recipient) {
                            document.getElementById(`recipient_${firstRow.id}`).value = recipient;
                        }
                    }
                }
                
                // Pre-fill booking ID for other rows
                multiPaymentRows.slice(1).forEach(row => {
                    document.getElementById(`bookingId_${row.id}`).value = bookingId;
                    document.getElementById(`guestName_${row.id}`).value = reservation.guest_name;
                    document.getElementById(`date_${row.id}`).value = date || new Date().toISOString().split('T')[0];
                });
                
                showToast('Switched to Multi-Payment', 'You can now add multiple payment entries', '✅');
            }, 100);
        }

        async function savePayment() {
            try {
                const bookingId = document.getElementById('paymentBookingId').value;
                const amount = parseFloat(document.getElementById('paymentAmount').value);
                const method = document.getElementById('paymentMethod').value;
                const editPaymentId = document.getElementById('editPaymentId').value;
                
                if (!amount || amount <= 0) {
                    showToast('Validation Error', 'Please enter a valid amount', '❌');
                    return;
                }
                
                if (!method) {
                    showToast('Validation Error', 'Please select payment method', '❌');
                    return;
                }
                
                const recipientGroup = document.getElementById('paymentRecipientGroup');
                if (recipientGroup.style.display !== 'none') {
                    const recipient = document.getElementById('paymentRecipient').value;
                    if (!recipient) {
                        showToast('Validation Error', 'Please select payment recipient', '❌');
                        return;
                    }
                }
                
                const paymentData = {
                    booking_id: bookingId,
                    payment_date: document.getElementById('paymentDate').value,
                    amount: amount,
                    payment_method: method,
                    payment_recipient: document.getElementById('paymentRecipient').value || null,
                    reference_number: document.getElementById('paymentReference').value || null,
                    notes: document.getElementById('paymentNotes').value || null,
                    created_by: currentUser?.id || null
                };
                
                if (navigator.onLine) {
                    if (editPaymentId) {
                        // Update existing payment
                        const { error } = await supabase
                            .from('payments')
                            .update(paymentData)
                            .eq('id', editPaymentId);
                        
                        if (error) throw error;
                        showToast('Success', 'Payment updated successfully!', '✅');
                    } else {
                        // Create new payment
                        await db.savePayment(paymentData);
                        showToast('Success', 'Payment saved successfully!', '✅');

                        // Send push notification for payment received
                        const reservation = await db.getReservation(bookingId);
                        if (reservation) {
                            notifyPaymentReceived(bookingId, amount, reservation.guest_name);
                        }
                    }

                    await recalculatePaymentStatus(bookingId);
                    closePaymentModal();
                    await loadPayments();
                    await loadReservations();
                    await loadDashboard();
                } else {
                    if (!confirm('You are offline. This payment will be saved locally and synced when you are back online. Continue?')) {
                        return;
                    }
                    await saveToOfflineDB('pendingPayments', paymentData);
                    closePaymentModal();
                    showToast('Saved Offline', 'Payment will sync when online', '💾');
                }
            } catch (error) {
                console.error('Payment error:', error);
                showToast('Error', 'Failed to save payment: ' + error.message, '❌');
            }
        }

        async function recalculatePaymentStatus(bookingId) {
            const payments = await db.getPayments(bookingId);
            const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            
            const reservation = await db.getReservation(bookingId);
            const totalAmount = parseFloat(reservation.total_amount) || 0;
            
            // Round to nearest rupee to avoid floating-point precision issues
            const paidRounded = Math.round(totalPaid);
            const totalRounded = Math.round(totalAmount);

            let paymentStatus = 'pending';
            if (paidRounded >= totalRounded) {
                paymentStatus = 'paid';
            } else if (paidRounded > 0) {
                paymentStatus = 'partial';
            }
            
            await supabase
                .from('reservations')
                .update({ 
                    paid_amount: totalPaid,
                    payment_status: paymentStatus
                })
                .eq('booking_id', bookingId);
        }

        // ==========================================
        // MULTI-PAYMENT ENTRY FUNCTIONS
        // ==========================================

        let multiPaymentRows = [];

        /**
         * Open multi-payment modal
         */
        function openMultiPaymentModal() {
            const modal = document.getElementById('multiPaymentModal');
            const title = modal.querySelector('.modal-title');
            
            // Reset title for general multi-payment entry
            title.innerHTML = '💰 Add Multiple Payments';
            
            modal.classList.add('active');
            document.getElementById('multiPaymentDate').value = new Date().toISOString().split('T')[0];
            
            // Initialize with 3 empty rows
            multiPaymentRows = [];
            addPaymentRow();
            addPaymentRow();
            addPaymentRow();
        }

        /**
         * Close multi-payment modal
         */
        function closeMultiPaymentModal() {
            document.getElementById('multiPaymentModal').classList.remove('active');
            multiPaymentRows = [];
        }

        /**
         * Add a payment entry row
         */
        function addPaymentRow() {
            const rowId = Date.now() + Math.random();
            multiPaymentRows.push({ id: rowId });
            renderPaymentRows();
        }

        /**
         * Remove a payment entry row
         */
        function removePaymentRow(rowId) {
            multiPaymentRows = multiPaymentRows.filter(row => row.id !== rowId);
            renderPaymentRows();
            
            if (multiPaymentRows.length === 0) {
                addPaymentRow(); // Always keep at least one row
            }
        }

        /**
         * Render payment entry rows - HYBRID (Table for desktop, Cards for mobile)
         */
        function renderPaymentRows() {
            const tableBody = document.getElementById('multiPaymentTableBody');
            const cardsContainer = document.getElementById('multiPaymentCardsContainer');
            const countEl = document.getElementById('paymentEntryCount');
            
            // Update entry count
            if (countEl) {
                countEl.textContent = `(${multiPaymentRows.length} ${multiPaymentRows.length === 1 ? 'entry' : 'entries'})`;
            }
            
            if (multiPaymentRows.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 40px; color: var(--text-secondary);">Click "Add Row" to start</td></tr>';
                cardsContainer.innerHTML = '<div class="text-center" style="padding: 40px; color: var(--text-secondary);">Click "Add Payment Entry" to start</div>';
                return;
            }
            
            // ========================================
            // RENDER DESKTOP TABLE VIEW
            // ========================================
            tableBody.innerHTML = multiPaymentRows.map(row => `
                <tr>
                    <td style="padding: 8px;">
                        <input type="text" 
                            id="bookingId_${row.id}" 
                            list="bookingIdList"
                            placeholder="Enter booking ID" 
                            onchange="autofillGuestName(${row.id})"
                            style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    </td>
                    <td style="padding: 8px;">
                        <input type="text" 
                            id="guestName_${row.id}" 
                            placeholder="Auto-filled" 
                            readonly
                            style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; background: #f8fafc;">
                    </td>
                    <td style="padding: 8px;">
                        <input type="number" 
                            id="amount_${row.id}" 
                            placeholder="0" 
                            min="0" 
                            step="0.01"
                            style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    </td>
                    <td style="padding: 8px;">
                        <input type="date" 
                            id="date_${row.id}"
                            style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                    </td>
                    <td style="padding: 8px;">
                        <select id="method_${row.id}" onchange="handleMethodChange(${row.id})" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px;">
                            <option value="">Select</option>
                            <option value="cash">💵 Cash</option>
                            <option value="upi">📱 UPI</option>
                            <option value="gateway">💳 Gateway</option>
                            <option value="bank_transfer">🏦 Bank</option>
                        </select>
                    </td>
                    <td style="padding: 8px;">
                        <select id="recipient_${row.id}" style="width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 4px; display: none;">
                            <option value="">Select</option>
                            <option value="Hostizzy">🏢 Hostizzy</option>
                            <option value="Property Owner">🏠 Owner</option>
                        </select>
                        <span id="recipient_na_${row.id}" style="color: #94a3b8; font-size: 13px;">N/A</span>
                    </td>
                    <td style="padding: 8px; text-align: center;">
                        <button class="btn btn-danger btn-sm" onclick="removePaymentRow(${row.id})" style="padding: 4px 8px;">
                            ✕
                        </button>
                    </td>
                </tr>
            `).join('');
            
            // ========================================
            // RENDER MOBILE CARD VIEW
            // ========================================
            cardsContainer.innerHTML = multiPaymentRows.map((row, index) => `
                <div class="payment-entry-card">
                    <div class="payment-entry-header">
                        <span class="payment-entry-number">Payment #${index + 1}</span>
                        ${multiPaymentRows.length > 1 ? `
                            <button class="payment-entry-remove" onclick="removePaymentRow(${row.id})" title="Remove">
                                ✕
                            </button>
                        ` : ''}
                    </div>
                    
                    <div class="payment-entry-fields">
                        <div class="payment-field payment-field-full">
                            <label>Booking ID *</label>
                            <input type="text" 
                                id="bookingId_mobile_${row.id}" 
                                list="bookingIdList"
                                placeholder="Enter or select booking ID" 
                                onchange="autofillGuestNameMobile(${row.id})"
                                required>
                        </div>
                        
                        <div class="payment-field payment-field-full">
                            <label>Guest Name</label>
                            <input type="text" 
                                id="guestName_mobile_${row.id}" 
                                placeholder="Auto-filled from booking" 
                                readonly>
                        </div>
                        
                        <div class="payment-field">
                            <label>Amount (₹) *</label>
                            <input type="number" 
                                id="amount_mobile_${row.id}" 
                                placeholder="0" 
                                min="0" 
                                step="0.01"
                                required>
                        </div>
                        
                        <div class="payment-field">
                            <label>Payment Date *</label>
                            <input type="date" 
                                id="date_mobile_${row.id}"
                                required>
                        </div>
                        
                        <div class="payment-field">
                            <label>Payment Method *</label>
                            <select id="method_mobile_${row.id}" onchange="handleMethodChangeMobile(${row.id})" required>
                                <option value="">Select Method</option>
                                <option value="cash">💵 Cash</option>
                                <option value="upi">📱 UPI</option>
                                <option value="gateway">💳 Gateway</option>
                                <option value="bank_transfer">🏦 Bank Transfer</option>
                            </select>
                        </div>
                        
                        <div class="payment-field" id="recipientField_mobile_${row.id}" style="display: none;">
                            <label>Received By *</label>
                            <select id="recipient_mobile_${row.id}">
                                <option value="">Select Recipient</option>
                                <option value="Hostizzy">🏢 Hostizzy</option>
                                <option value="Property Owner">🏠 Property Owner</option>
                            </select>
                        </div>
                    </div>
                </div>
            `).join('');
            
            // Add datalist for booking IDs (shared by both views)
            if (!document.getElementById('bookingIdList')) {
                const datalistHTML = `
                    <datalist id="bookingIdList">
                        ${allReservations.map(r => 
                            `<option value="${r.booking_id}">${r.guest_name} - ${r.property_name}</option>`
                        ).join('')}
                    </datalist>
                `;
                tableBody.insertAdjacentHTML('afterend', datalistHTML);
            }
        }

        /**
         * Auto-fill guest name when booking ID is selected
         */
        function autofillGuestName(rowId) {
            const bookingId = document.getElementById(`bookingId_${rowId}`).value;
            const reservation = allReservations.find(r => r.booking_id === bookingId);
            
            if (reservation) {
                document.getElementById(`guestName_${rowId}`).value = reservation.guest_name;
                
                // Auto-fill amount with balance if available
                const total = parseFloat(reservation.total_amount) || 0;
                const paid = parseFloat(reservation.paid_amount) || 0;
                const otaFee = parseFloat(reservation.ota_service_fee) || 0;
                const isOTA = reservation.booking_source && reservation.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                
                if (balance > 0 && !document.getElementById(`amount_${rowId}`).value) {
                    document.getElementById(`amount_${rowId}`).value = Math.round(balance);
                }
            } else {
                document.getElementById(`guestName_${rowId}`).value = '';
            }
        }

        /**
         * Handle payment method change to show/hide recipient field
         */
        function handleMethodChange(rowId) {
            const method = document.getElementById(`method_${rowId}`).value;
            const recipientSelect = document.getElementById(`recipient_${rowId}`);
            const recipientNA = document.getElementById(`recipient_na_${rowId}`);
            
            if (method === 'cash' || method === 'upi' || method === 'bank_transfer') {
                recipientSelect.style.display = 'block';
                recipientNA.style.display = 'none';
                recipientSelect.required = true;
            } else if (method === '') {
                recipientSelect.style.display = 'none';
                recipientNA.style.display = 'none';
                recipientSelect.required = false;
            } else {
                recipientSelect.style.display = 'none';
                recipientNA.style.display = 'block';
                recipientSelect.required = false;
                recipientSelect.value = '';
            }
        }

        /**
         * Auto-fill guest name for mobile cards
         */
        function autofillGuestNameMobile(rowId) {
            const bookingId = document.getElementById(`bookingId_mobile_${rowId}`).value;
            const reservation = allReservations.find(r => r.booking_id === bookingId);
            
            if (reservation) {
                document.getElementById(`guestName_mobile_${rowId}`).value = reservation.guest_name;
                
                // Auto-fill amount with balance if available
                const total = parseFloat(reservation.total_amount) || 0;
                const paid = parseFloat(reservation.paid_amount) || 0;
                const balance = total - paid;
                
                if (balance > 0 && !document.getElementById(`amount_mobile_${rowId}`).value) {
                    document.getElementById(`amount_mobile_${rowId}`).value = Math.round(balance);
                }
                
                // Sync with desktop view
                const desktopBookingId = document.getElementById(`bookingId_${rowId}`);
                const desktopGuestName = document.getElementById(`guestName_${rowId}`);
                const desktopAmount = document.getElementById(`amount_${rowId}`);
                
                if (desktopBookingId) desktopBookingId.value = bookingId;
                if (desktopGuestName) desktopGuestName.value = reservation.guest_name;
                if (desktopAmount && balance > 0 && !desktopAmount.value) {
                    desktopAmount.value = Math.round(balance);
                }
            } else {
                document.getElementById(`guestName_mobile_${rowId}`).value = '';
            }
        }

        /**
         * Handle payment method change for mobile cards
         */
        function handleMethodChangeMobile(rowId) {
            const method = document.getElementById(`method_mobile_${rowId}`).value;
            const recipientField = document.getElementById(`recipientField_mobile_${rowId}`);
            const recipientSelect = document.getElementById(`recipient_mobile_${rowId}`);
            
            if (method === 'cash' || method === 'upi' || method === 'bank_transfer') {
                recipientField.style.display = 'block';
                recipientSelect.required = true;
            } else {
                recipientField.style.display = 'none';
                recipientSelect.required = false;
                recipientSelect.value = '';
            }
            
            // Sync with desktop view
            const desktopMethod = document.getElementById(`method_${rowId}`);
            if (desktopMethod) {
                desktopMethod.value = method;
                handleMethodChange(rowId);
            }
        }

        /**
         * Apply common settings to all rows
         */
        function applyCommonSettings() {
            const method = document.getElementById('multiPaymentMethod').value;
            const date = document.getElementById('multiPaymentDate').value;
            
            multiPaymentRows.forEach(row => {
                if (method) {
                    document.getElementById(`method_${row.id}`).value = method;
                }
                if (date) {
                    document.getElementById(`date_${row.id}`).value = date;
                }
            });
            
            showToast('Common settings applied to all rows', 'success');
        }

        /**
         * Save multiple payments
         */
        async function saveMultiplePayments() {
            try {
                const payments = [];
                
                // Determine if we're on mobile or desktop
                const isMobile = window.innerWidth <= 768;
                const prefix = isMobile ? 'mobile_' : '';
                
                for (const row of multiPaymentRows) {
                    const bookingId = document.getElementById(`bookingId_${prefix}${row.id}`).value.trim();
                    const amount = parseFloat(document.getElementById(`amount_${prefix}${row.id}`).value);
                    const date = document.getElementById(`date_${prefix}${row.id}`).value;
                    const method = document.getElementById(`method_${prefix}${row.id}`).value;
                    
                    // Validate required fields
                    if (!bookingId || !amount || !date || !method) {
                        showToast('Error', 'Please fill all required fields for all entries', '❌');
                        return;
                    }
                    
                    // Get recipient if needed
                    let recipient = '';
                    const recipientEl = document.getElementById(`recipient_${prefix}${row.id}`);
                    if (recipientEl && recipientEl.style.display !== 'none') {
                        recipient = recipientEl.value;
                        if (!recipient) {
                            showToast('Error', 'Please select payment recipient for all entries', '❌');
                            return;
                        }
                    }
                    
                    // Verify booking exists
                    const reservation = allReservations.find(r => r.booking_id === bookingId);
                    if (!reservation) {
                        showToast('Error', `Booking ID "${bookingId}" not found`, '❌');
                        return;
                    }
                    
                    payments.push({
                        booking_id: bookingId,
                        amount: amount,
                        payment_date: date,
                        payment_method: method,
                        payment_recipient: recipient || null,
                        notes: `Multi-payment entry`,
                        created_at: new Date().toISOString()
                    });
                }
                
                if (payments.length === 0) {
                    showToast('Error', 'No valid payments to save', '❌');
                    return;
                }
                
                // Save all payments
                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert(payments);
                    
                if (paymentError) throw paymentError;
                
                // Update paid amounts for each reservation
                for (const payment of payments) {
                    const reservation = allReservations.find(r => r.booking_id === payment.booking_id);
                    if (reservation) {
                        const newPaidAmount = (parseFloat(reservation.paid_amount) || 0) + payment.amount;
                        const total = parseFloat(reservation.total_amount) || 0;
                        const tolerance = 1;
                        const newStatus = newPaidAmount >= (total - tolerance) ? 'paid' : (newPaidAmount > 0 ? 'partial' : 'pending');
                        
                        await supabase
                            .from('reservations')
                            .update({
                                paid_amount: newPaidAmount,
                                payment_status: newStatus
                            })
                            .eq('booking_id', payment.booking_id);
                    }
                }
                
                showToast('Success', `✅ ${payments.length} payment(s) saved successfully!`, '✅');
                closeMultiPaymentModal();
                loadPayments();
                
            } catch (error) {
                console.error('Save error:', error);
                showToast('Error', error.message, '❌');
            }
        }

        /**
         * Open multi-payment modal for a specific reservation
         */
        function openMultiPaymentModalForReservation(bookingId) {
            const reservation = allReservations.find(r => r.booking_id === bookingId);
            
            if (!reservation) {
                showToast('Error', 'Reservation not found', '❌');
                return;
            }
            
            const modal = document.getElementById('multiPaymentModal');
            const title = modal.querySelector('.modal-title');
            
            // Update title to show it's for a specific reservation
            title.innerHTML = `💰 Add Multiple Payments - ${reservation.guest_name}`;
            
            // Pre-fill booking ID in all rows
            document.getElementById('multiPaymentDate').value = new Date().toISOString().split('T')[0];
            
            // Initialize with 2 empty rows
            multiPaymentRows = [];
            addPaymentRow();
            addPaymentRow();
            
            // Pre-fill booking ID and guest name in all rows
            setTimeout(() => {
                multiPaymentRows.forEach(row => {
                    document.getElementById(`bookingId_${row.id}`).value = bookingId;
                    document.getElementById(`guestName_${row.id}`).value = reservation.guest_name;
                    
                    // Set default date
                    document.getElementById(`date_${row.id}`).value = new Date().toISOString().split('T')[0];
                });
            }, 100);
            
            modal.classList.add('active');
        }

        // Payment History Modal
        async function viewPaymentHistory(bookingId) {
            try {
                const modal = document.getElementById('paymentHistoryModal');
                const reservation = allReservations.find(r => r.booking_id === bookingId);
                
                if (!reservation) {
                    showToast('Error', 'Reservation not found', '❌');
                    return;
                }
                
                const payments = await db.getPayments(bookingId);
                
                const total = parseFloat(reservation.total_amount) || 0;
                const paid = parseFloat(reservation.paid_amount) || 0;
                const otaFee = parseFloat(reservation.ota_service_fee) || 0;
                const isOTA = reservation.booking_source && reservation.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                
                document.getElementById('historyTotalAmount').textContent = '₹' + Math.round(total).toLocaleString('en-IN');
                document.getElementById('historyPaidAmount').textContent = '₹' + Math.round(paid).toLocaleString('en-IN');
                document.getElementById('historyBalance').textContent = '₹' + Math.round(balance).toLocaleString('en-IN');
                
                const statusEl = document.getElementById('historyStatus');
                const status = reservation.payment_status || 'pending';
                statusEl.textContent = status.toUpperCase();
                statusEl.style.color = status === 'paid' ? 'var(--success)' : 
                                      status === 'partial' ? 'var(--warning)' : 'var(--danger)';
                
                const listEl = document.getElementById('paymentHistoryList');
                
                if (payments.length === 0) {
                    listEl.innerHTML = '<div class="text-center" style="padding: 24px; color: var(--text-secondary);">No payments recorded yet</div>';
                } else {
                    listEl.innerHTML = `
                        <table style="width: 100%;">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Method</th>
                                    <th>Recipient</th>
                                    <th>Reference</th>
                                    <th style="text-align: right;">Amount</th>
                                    <th style="text-align: center;">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(p => `
                                    <tr>
                                        <td>
                                            <div style="font-weight: 600;">${formatDate(p.payment_date)}</div>
                                            ${p.notes ? `<div style="font-size: 12px; color: var(--text-secondary);">${p.notes}</div>` : ''}
                                        </td>
                                        <td>
                                            <div style="text-transform: capitalize;">${p.payment_method.replace('_', ' ')}</div>
                                        </td>
                                        <td>
                                            ${p.payment_recipient ? 
                                                `<span class="badge badge-${p.payment_recipient === 'hostizzy' ? 'confirmed' : 'pending'}" style="text-transform: capitalize;">
                                                    ${p.payment_recipient === 'hostizzy' ? '🏢 Hostizzy' : '🏠 Owner'}
                                                </span>` 
                                                : '<span style="color: var(--text-secondary);">-</span>'}
                                        </td>
                                        <td>
                                            <div style="font-size: 12px; font-family: monospace;">${p.reference_number || '-'}</div>
                                        </td>
                                        <td style="text-align: right;">
                                            <div style="font-size: 16px; font-weight: 700; color: var(--success);">
                                                ₹${Math.round(p.amount).toLocaleString('en-IN')}
                                            </div>
                                        </td>
                                        <td style="text-align: center;">
                                            <div style="display: flex; gap: 4px; justify-content: center;">
                                                <button onclick="editPayment(${p.id})" class="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                <button onclick="deletePayment(${p.id}, '${bookingId}')" class="btn btn-danger btn-sm" title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `;
                }
                
                modal.classList.add('active');
            } catch (error) {
                console.error('Payment history error:', error);
                showToast('Error', 'Failed to load payment history', '❌');
            }
        }

        function closePaymentHistoryModal() {
            document.getElementById('paymentHistoryModal').classList.remove('active');
        }

        async function deletePayment(paymentId, bookingId) {
            if (!confirm('Delete this payment?')) return;
            
            try {
                await db.deletePayment(paymentId);
                await recalculatePaymentStatus(bookingId);
                await viewPaymentHistory(bookingId);
                await loadPayments();
                await loadReservations();
                await loadDashboard();
                showToast('Deleted', 'Payment deleted successfully', '✅');
            } catch (error) {
                console.error('Delete payment error:', error);
                showToast('Error', 'Failed to delete payment', '❌');
            }
        }

        /**
         * Edit existing payment
         */
        async function editPayment(paymentId) {
            try {
                // Fetch payment details
                const { data: payment, error } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('id', paymentId)
                    .single();
                
                if (error) throw error;
                
                if (!payment) {
                    showToast('Payment not found', 'error');
                    return;
                }
                
                // Open payment modal with existing data
                await openPaymentModal(payment.booking_id);
                
                // Populate fields with existing payment data
                document.getElementById('editPaymentId').value = paymentId;
                document.getElementById('paymentAmount').value = payment.amount;
                document.getElementById('paymentDate').value = payment.payment_date;
                document.getElementById('paymentMethod').value = payment.payment_method;
                document.getElementById('paymentRecipient').value = payment.payment_recipient || '';
                document.getElementById('paymentReference').value = payment.reference_number || '';
                document.getElementById('paymentNotes').value = payment.notes || '';
                
                // Show recipient field if needed
                toggleRecipientField();
                
                // Change button text
                const saveButton = document.querySelector('#paymentModal .btn-primary');
                saveButton.textContent = '💾 Update Payment';
                
                // Close payment history modal
                document.getElementById('paymentHistoryModal').classList.remove('active');
                
            } catch (error) {
                console.error('Error loading payment for edit:', error);
                showToast('Failed to load payment details', 'error');
            }
        }
        // Properties
        async function loadProperties() {
            try {
                const properties = await db.getProperties();
                const reservations = await db.getReservations();
                const payments = await db.getAllPayments();
                const grid = document.getElementById('propertiesGrid');
                
                grid.innerHTML = properties.map(p => {
                    const propBookings = reservations.filter(r => r.property_id === p.id);
                    const activeBookings = propBookings.filter(r => r.status === 'checked-in').length;
                    const totalBookings = propBookings.length;
                    
                    // Calculate revenue
                    const totalRevenue = propBookings.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
                    
                    // Calculate occupancy
                    const totalNights = propBookings.reduce((sum, r) => sum + (parseInt(r.nights) || 0), 0);
                    const occupancyPercent = totalNights > 0 ? Math.round((totalNights / 365) * 100) : 0;
                    
                    // Sync status
                    const syncStatus = getSyncStatusBadge(p);
                    const lastSynced = p.ical_last_synced ? 
                        formatTimeAgo(new Date(p.ical_last_synced)) : 'Never';
                    
                    return `
                        <div class="property-card">
                            <div class="property-card-header">
                                <div>
                                    <h3 style="margin-bottom: 4px; font-size: 18px;">${p.name}</h3>
                                    <p style="color: rgba(255, 255, 255, 0.9); font-size: 13px; margin: 0;">📍 ${p.location || 'No location'}</p>
                                </div>
                                <button onclick="openPropertySettings(${p.id})" class="btn-icon" title="Settings">
                                    ⚙️
                                </button>
                            </div>
                            
                            <div class="property-stats">
                                <div class="property-stat">
                                    <div class="property-stat-value">${totalBookings}</div>
                                    <div class="property-stat-label">Bookings</div>
                                </div>
                                <div class="property-stat">
                                    <div class="property-stat-value">₹${(totalRevenue / 100000).toFixed(1)}L</div>
                                    <div class="property-stat-label">Revenue</div>
                                </div>
                                <div class="property-stat">
                                    <div class="property-stat-value">${occupancyPercent}%</div>
                                    <div class="property-stat-label">Occupancy</div>
                                </div>
                            </div>
                            
                            <div class="property-sync">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                                    <span style="font-size: 13px; font-weight: 600;">🔗 iCal Sync</span>
                                    ${syncStatus}
                                </div>
                                ${p.ical_url ? `
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        Last synced: ${lastSynced}
                                    </div>
                                ` : `
                                    <div style="font-size: 12px; color: var(--text-secondary);">
                                        No iCal URL configured
                                    </div>
                                `}
                            </div>
                            
                            <div class="property-actions">
                                <button class="btn btn-sm btn-secondary" onclick="showPropertyCalendar(${p.id})" style="flex: 1;">
                                    📅 Calendar
                                </button>
                                ${p.ical_url ? `
                                    <button class="btn btn-sm btn-primary" onclick="syncPropertyNow(${p.id}, event)" style="flex: 1;">
                                        🔄 Sync Now
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            } catch (error) {
                console.error('Properties error:', error);
                showToast('Error', 'Failed to load properties', '❌');
            }
        }
        
        function getSyncStatusBadge(property) {
            if (!property.ical_url) {
                return '<span style="font-size: 11px; padding: 3px 8px; background: #e2e8f0; color: #64748b; border-radius: 12px;">Not Configured</span>';
            }
            
            if (property.ical_sync_status === 'syncing') {
                return '<span style="font-size: 11px; padding: 3px 8px; background: #dbeafe; color: #2563eb; border-radius: 12px;">⏳ Syncing...</span>';
            }
            
            if (property.ical_sync_status === 'error') {
                return '<span style="font-size: 11px; padding: 3px 8px; background: #fee2e2; color: #dc2626; border-radius: 12px;">❌ Error</span>';
            }
            
            if (property.ical_last_synced) {
                return '<span style="font-size: 11px; padding: 3px 8px; background: #dcfce7; color: #16a34a; border-radius: 12px;">✅ Active</span>';
            }
            
            return '<span style="font-size: 11px; padding: 3px 8px; background: #fef3c7; color: #ca8a04; border-radius: 12px;">⏸️ Idle</span>';
        }
        
    function formatTimeAgo(dateLike) {
        if (!dateLike) return 'Never';

        // Accept Date, ISO string, or timestamp (seconds/milliseconds)
        let d = dateLike instanceof Date ? dateLike : new Date(dateLike);
        // If it’s a numeric string like "1729012345", treat as seconds epoch
        if (!(d instanceof Date) || isNaN(d.getTime())) {
            const n = Number(dateLike);
            if (!Number.isNaN(n)) {
            d = new Date(n > 1e12 ? n : n * 1000);
            }
        }
        if (isNaN(d.getTime())) return 'Unknown';

        const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
        if (seconds < 60)    return 'Just now';
        if (seconds < 3600)  return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hrs ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';

        return d.toLocaleDateString('en-IN');
        }

        function openPropertyModal() {
            document.getElementById('propertyModal').classList.add('active');
        }

        function closePropertyModal() {
            document.getElementById('propertyModal').classList.remove('active');
            document.getElementById('propertyName').value = '';
            document.getElementById('propertyLocation').value = '';
        }

        async function saveProperty() {
            try {
                const property = {
                    name: document.getElementById('propertyName').value,
                    location: document.getElementById('propertyLocation').value,
                    type: document.getElementById('propertyType').value,
                    capacity: parseInt(document.getElementById('propertyCapacity').value)
                };
                
                if (!property.name || !property.location) {
                    showToast('Validation Error', 'Please fill in all required fields', '❌');
                    return;
                }

                // Get all existing properties to determine next ID
                const { data: existingProperties, error: fetchError } = await supabase
                    .from('properties')
                    .select('id')
                    .order('id', { ascending: false })
                    .limit(1);

                if (fetchError) throw fetchError;

                // Calculate next available ID
                const nextId = existingProperties?.length > 0 ? 
                    (existingProperties[0].id + 1) : 1;

                // Add the ID to property object
                property.id = nextId;

                // Insert the new property
                const { data, error } = await supabase
                    .from('properties')
                    .insert([property])
                    .select();

                if (error) throw error;

                closePropertyModal();
                await loadProperties(); // Refresh the properties list
                showToast('Success', 'Property saved!', '✅');
            } catch (error) {
                console.error('Save property error:', error);
                showToast('Error', 'Failed to save property: ' + error.message, '❌');
            }
        }
        async function deleteProperty(id) {
            if (!confirm('Delete this property?')) return;
            
            try {
                await db.deleteProperty(id);
                await loadProperties();
                showToast('Deleted', 'Property deleted successfully', '✅');
            } catch (error) {
                console.error('Delete property error:', error);
                showToast('Error', 'Failed to delete property', '❌');
            }
        }

        // ==========================================
        // PROPERTY SETTINGS FUNCTIONS
        // ==========================================

        /**
         * Open property settings modal
         */
        async function openPropertySettings(propertyId) {
            try {
                // Fetch property details
                const { data: property, error } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('id', propertyId)
                    .single();

                if (error) throw error;

                // Populate modal
                document.getElementById('settingsPropertyId').value = propertyId;
                document.getElementById('settingsModalTitle').textContent = `${property.name} Settings`;
                document.getElementById('settingsPropertyName').textContent = property.name;
                document.getElementById('settingsPropertyLocation').textContent = property.location || 'No location set';
                
                // Set property icon based on type
                const iconMap = {
                    'Villa': '🏡',
                    'Apartment': '🏢',
                    'Hotel': '🏨',
                    'Hostel': '🏠',
                    'Resort': '🌴'
                };
                document.getElementById('settingsPropertyIcon').textContent = iconMap[property.type] || '🏠';

                // Populate iCal URL if exists
                document.getElementById('icalUrlInput').value = property.ical_url || '';

                // Show current sync status if URL exists
                if (property.ical_url) {
                    document.getElementById('currentSyncStatus').style.display = 'block';
                    document.getElementById('currentStatusBadge').innerHTML = getSyncStatusBadge(property);
                    
                    if (property.ical_last_synced) {
                        document.getElementById('currentLastSync').textContent = `Last synced: ${formatTimeAgo(property.ical_last_synced)}`;
                    } else {
                        document.getElementById('currentLastSync').textContent = 'Never synced';
                    }

                    // Show error if exists
                    if (property.ical_sync_error) {
                        document.getElementById('currentSyncError').style.display = 'block';
                        document.getElementById('currentSyncError').textContent = `⚠️ Error: ${property.ical_sync_error}`;
                    } else {
                        document.getElementById('currentSyncError').style.display = 'none';
                    }
                } else {
                    document.getElementById('currentSyncStatus').style.display = 'none';
                }

                // Show modal
                document.getElementById('propertySettingsModal').style.display = 'flex';

            } catch (error) {
                console.error('Error opening property settings:', error);
                showToast('Failed to load property settings', 'error');
            }
        }

        /**
         * Close property settings modal
         */
        function closePropertySettings() {
            document.getElementById('propertySettingsModal').style.display = 'none';
            document.getElementById('icalUrlInput').value = '';
            document.getElementById('settingsPropertyId').value = '';
        }

        /**
         * Save property settings (iCal URL)
         */
        async function savePropertySettings() {
            const propertyId = document.getElementById('settingsPropertyId').value;
            const icalUrl = document.getElementById('icalUrlInput').value.trim();

            // Validate URL if provided
            if (icalUrl) {
                try {
                    new URL(icalUrl);
                    
                    // Check if it's a valid iCal URL pattern
                    if (!icalUrl.includes('ical') && !icalUrl.includes('.ics')) {
                        showToast('Please enter a valid iCal URL (should contain "ical" or ".ics")', 'error');
                        return;
                    }
                } catch (e) {
                    showToast('Please enter a valid URL', 'error');
                    return;
                }
            }

            try {
                // Show loading
                const saveButton = event.target;
                const originalText = saveButton.innerHTML;
                saveButton.innerHTML = '⏳ Saving...';
                saveButton.disabled = true;

                // Update property with new iCal URL
                const updateData = {
                    ical_url: icalUrl || null,
                    ical_sync_status: icalUrl ? 'idle' : null,
                    updated_at: new Date().toISOString()
                };

                // Clear error if URL is being updated
                if (icalUrl) {
                    updateData.ical_sync_error = null;
                }

                const { error } = await supabase
                    .from('properties')
                    .update(updateData)
                    .eq('id', propertyId);

                if (error) throw error;

                // Success
                showToast(icalUrl ? '✅ iCal URL saved successfully!' : '✅ iCal URL removed', 'success');
                
                // Close modal
                closePropertySettings();

                // Reload properties to reflect changes
                await loadProperties();

            } catch (error) {
                console.error('Error saving property settings:', error);
                showToast('Failed to save settings', 'error');
                
                // Restore button
                event.target.innerHTML = originalText;
                event.target.disabled = false;
            }
        }

        // ==========================================
        // ICAL SYNC FUNCTIONS
        // ==========================================

        /**
         * Fetch and parse iCal file from URL
         */
        async function fetchAndParseIcal(icalUrl) {
            try {
                // ✅ Normalize Airbnb's "webcal://" URLs
                icalUrl = icalUrl.replace(/^webcal:/i, 'https:');
                // Use CORS proxy to fetch iCal file
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`;
                
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/calendar, text/plain, */*'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`);
                }

                const icalData = await response.text();
                
                // Validate it's an iCal file
                if (!icalData.includes('BEGIN:VCALENDAR')) {
                    throw new Error('Invalid iCal format: Missing VCALENDAR');
                }

                // Parse iCal data
                const blockedDates = parseIcalData(icalData);
                
                return {
                    success: true,
                    dates: blockedDates,
                    rawData: icalData
                };

            } catch (error) {
                console.error('Error fetching iCal:', error);
                return {
                    success: false,
                    error: error.message,
                    dates: []
                };
            }
        }

        /**
         * Parse iCal data and extract blocked dates
         */
        function parseIcalData(icalText) {
            const blockedDates = [];
            const unfolded = icalText.replace(/\r?\n[ \t]/g, '');
            const events = unfolded.split('BEGIN:VEVENT');
            
            try {
                // Split by VEVENT blocks
                const events = icalText.split('BEGIN:VEVENT');
                
                for (let i = 1; i < events.length; i++) {
                    const eventBlock = events[i].split('END:VEVENT')[0];
                    
                    // Extract DTSTART and DTEND
                    const dtstart = extractIcalField(eventBlock, 'DTSTART');
                    const dtend = extractIcalField(eventBlock, 'DTEND');
                    const summary = extractIcalField(eventBlock, 'SUMMARY') || 'Blocked by OTA';
                    const uid = extractIcalField(eventBlock, 'UID') || `event_${i}`;
                    
                    if (dtstart && dtend) {
                        // Parse dates
                        const startDate = parseIcalDate(dtstart);
                        const endDate = parseIcalDate(dtend);
                        
                        if (startDate && endDate) {
                            // Get all dates in the range (inclusive start, exclusive end as per iCal spec)
                            const dateRange = getDateRange(startDate, endDate);
                            
                            dateRange.forEach(date => {
                                blockedDates.push({
                                    date: date,
                                    summary: summary,
                                    uid: uid
                                });
                            });
                        }
                    }
                }
                
                // Remove duplicates and sort
                const uniqueDates = Array.from(new Map(blockedDates.map(d => [d.date, d])).values());
                uniqueDates.sort((a, b) => new Date(a.date) - new Date(b.date));
                
                return uniqueDates;
                
            } catch (error) {
                console.error('Error parsing iCal data:', error);
                return [];
            }
        }

        /**
         * Extract field value from iCal event block
         */
        function extractIcalField(eventBlock, fieldName) {
            // Match field with possible parameters (e.g., DTSTART;VALUE=DATE:20250101)
            const regex = new RegExp(`${fieldName}[^:]*:(.+)`, 'i');
            const match = eventBlock.match(regex);
            
            if (match && match[1]) {
                return match[1].trim();
            }
            
            return null;
        }

        /**
         * Parse iCal date format to YYYY-MM-DD
         */
        function parseIcalDate(icalDate) {
            try {
                // Remove any timezone info and clean the string
                let dateStr = icalDate.replace(/[TZ]/g, '').trim();
                
                // Handle different iCal date formats
                // Format: YYYYMMDD or YYYYMMDDTHHMMSS
                if (dateStr.length >= 8) {
                    const year = dateStr.substring(0, 4);
                    const month = dateStr.substring(4, 6);
                    const day = dateStr.substring(6, 8);
                    
                    return `${year}-${month}-${day}`;
                }
                
                return null;
            } catch (error) {
                console.error('Error parsing iCal date:', icalDate, error);
                return null;
            }
        }

        // UTC-safe date range: inclusive start, exclusive end (iCal spec)
        function getDateRange(startDate, endDate) {
        // startDate/endDate are "YYYY-MM-DD"
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);

        let current = new Date(Date.UTC(sy, sm - 1, sd));
        const end = new Date(Date.UTC(ey, em - 1, ed));

        const dates = [];
        while (current < end) {
            const y = current.getUTCFullYear();
            const m = String(current.getUTCMonth() + 1).padStart(2, '0');
            const d = String(current.getUTCDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${d}`);
            // advance one UTC day
            current.setUTCDate(current.getUTCDate() + 1);
        }
        return dates;
        }

        /**
         * Save synced dates to database
         */
        async function saveSyncedDates(propertyId, blockedDates, source = 'ical') {
            try {
                // First, delete existing synced dates for this property from this source
                const { error: deleteError } = await supabase
                    .from('synced_availability')
                    .delete()
                    .eq('property_id', propertyId)
                    .eq('source', source);

                if (deleteError) throw deleteError;

                // Prepare batch insert data
                const insertData = blockedDates.map(item => ({
                    property_id: propertyId,
                    blocked_date: item.date,
                    source: source,
                    booking_summary: item.summary || 'Blocked by OTA',
                    synced_at: new Date().toISOString()
                }));

                // Insert in batches of 100 to avoid payload size limits
                const batchSize = 100;
                for (let i = 0; i < insertData.length; i += batchSize) {
                    const batch = insertData.slice(i, i + batchSize);
                    
                    const { error: insertError } = await supabase
                        .from('synced_availability')
                        .insert(batch);

                    if (insertError) throw insertError;
                }

                return {
                    success: true,
                    count: insertData.length
                };

            } catch (error) {
                console.error('Error saving synced dates:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }

        /**
         * Update property sync status
         */
        async function updatePropertySyncStatus(propertyId, status, error = null) {
            try {
                const updateData = {
                    ical_sync_status: status,
                    ical_last_synced: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                if (error) {
                    updateData.ical_sync_error = error;
                } else {
                    updateData.ical_sync_error = null;
                }

                const { error: updateError } = await supabase
                    .from('properties')
                    .update(updateData)
                    .eq('id', propertyId);

                if (updateError) throw updateError;

                return true;

            } catch (err) {
                console.error('Error updating sync status:', err);
                return false;
            }
        }

        /**
         * Sync property availability now (manual trigger)
         */
        async function syncPropertyNow(propertyId, event) {
            let syncButton = null;
            let originalHTML = '';
            
            try {
                // Get property details
                const { data: property, error: propError } = await supabase
                    .from('properties')
                    .select('*')
                    .eq('id', propertyId)
                    .single();

                if (propError) throw propError;

                // Check if iCal URL exists
                if (!property.ical_url) {
                    showToast('⚠️ No iCal URL configured for this property', 'error');
                    return;
                }

                // Update button state if event is provided
                if (event && event.target) {
                    syncButton = event.target;
                    originalHTML = syncButton.innerHTML;
                    syncButton.innerHTML = '⏳ Syncing...';
                    syncButton.disabled = true;
                }

                // Show progress toast
                showToast('🔄 Fetching availability from OTA...', 'info');

                // Update status to syncing
                await updatePropertySyncStatus(propertyId, 'syncing');

                // Fetch and parse iCal
                const result = await fetchAndParseIcal(property.ical_url);

                if (!result.success) {
                    throw new Error(result.error || 'Failed to fetch iCal data');
                }

                // Check if we got any dates
                if (result.dates.length === 0) {
                    await updatePropertySyncStatus(propertyId, 'active');
                    showToast('✅ Sync completed - No blocked dates found', 'success');
                    await loadProperties();
                    return;
                }

                // Save synced dates to database
                showToast(`💾 Saving ${result.dates.length} blocked dates...`, 'info');
                
                const saveResult = await saveSyncedDates(propertyId, result.dates, 'ical');

                if (!saveResult.success) {
                    throw new Error(saveResult.error || 'Failed to save synced dates');
                }

                // Update status to active
                await updatePropertySyncStatus(propertyId, 'active');

                // Success!
                showToast(`✅ Sync completed! ${saveResult.count} dates blocked`, 'success');

                // Reload properties to show updated status
                await loadProperties();

            } catch (error) {
                console.error('Error syncing property:', error);
                
                // Update status to error
                await updatePropertySyncStatus(propertyId, 'error', error.message);
                
                showToast(`❌ Sync failed: ${error.message}`, 'error');
                
                // Reload to show error status
                await loadProperties();

                } finally {
                    // Restore button if it still exists
                    if (syncButton && originalHTML) {
                        syncButton.innerHTML = originalHTML;
                        syncButton.disabled = false;
                    }
                }
        }
        // ==========================================
        // AUTO-SYNC FUNCTIONS
        // ==========================================

        let autoSyncIntervals = {}; // Store interval IDs by property

        /**
         * Toggle auto-sync info display
         */
        function toggleAutoSyncInfo() {
            const enabled = document.getElementById('autoSyncEnabled').checked;
            const infoDiv = document.getElementById('autoSyncInfo');
            
            if (enabled) {
                infoDiv.style.display = 'block';
                updateNextSyncTime();
            } else {
                infoDiv.style.display = 'none';
            }
        }

        /**
         * Update next sync time display
         */
        function updateNextSyncTime() {
            const now = new Date();
            const nextSync = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // 6 hours from now
            document.getElementById('nextSyncTime').textContent = nextSync.toLocaleString();
        }

        /**
         * Start auto-sync for a property
         */
        function startAutoSync(propertyId) {
            // Clear existing interval if any
            if (autoSyncIntervals[propertyId]) {
                clearInterval(autoSyncIntervals[propertyId]);
            }
            
            // Set up auto-sync every 6 hours (6 * 60 * 60 * 1000 ms)
            const syncInterval = 6 * 60 * 60 * 1000; // 6 hours
            
            autoSyncIntervals[propertyId] = setInterval(async () => {
                console.log(`🔄 Auto-syncing property ${propertyId}...`);
                try {
                    await syncPropertyNow(propertyId);
                    console.log(`✅ Auto-sync completed for property ${propertyId}`);
                } catch (error) {
                    console.error(`❌ Auto-sync failed for property ${propertyId}:`, error);
                }
            }, syncInterval);
            
            console.log(`✅ Auto-sync enabled for property ${propertyId} (every 6 hours)`);
        }

        /**
         * Stop auto-sync for a property
         */
        function stopAutoSync(propertyId) {
            if (autoSyncIntervals[propertyId]) {
                clearInterval(autoSyncIntervals[propertyId]);
                delete autoSyncIntervals[propertyId];
                console.log(`⏹️ Auto-sync disabled for property ${propertyId}`);
            }
        }

        /**
         * Initialize auto-sync for all properties with iCal URLs
         */
        async function initializeAutoSync() {
            try {
                const { data: properties, error } = await supabase
                    .from('properties')
                    .select('id, name, ical_url, auto_sync_enabled')
                    .eq('is_active', true)
                    .not('ical_url', 'is', null);
                
                if (error) throw error;
                
                if (properties && properties.length > 0) {
                    properties.forEach(property => {
                        // Check if auto_sync_enabled column exists and is true
                        // For now, auto-enable for all properties with iCal URLs
                        startAutoSync(property.id);
                    });
                    
                    console.log(`🔄 Auto-sync initialized for ${properties.length} properties`);
                }
            } catch (error) {
                console.error('Error initializing auto-sync:', error);
            }
        }

        // Initialize Performance View
        async function initializePerformanceView() {
            try {
                // Populate property dropdown
                const properties = await db.getProperties();
                const propertyFilter = document.getElementById('performancePropertyFilter');
                propertyFilter.innerHTML = '<option value="">🏠 All Properties</option>' + 
                    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
                
                // Populate month dropdown with unique months from reservations
                const reservations = await db.getReservations();
                const months = [...new Set(reservations.map(r => r.month).filter(Boolean))].sort().reverse();
                const monthFilter = document.getElementById('performanceMonthFilter');
                monthFilter.innerHTML = '<option value="">All Months</option>' + 
                    months.map(m => `<option value="${m}">${m}</option>`).join('');
                
                // Set default date range to current year
                const today = new Date();
                document.getElementById('performanceStartDate').value = `${today.getFullYear()}-01-01`;
                document.getElementById('performanceEndDate').value = today.toISOString().split('T')[0];
                
                // Load initial data
                await loadPropertyPerformance();
            } catch (error) {
                console.error('Performance initialization error:', error);
                showToast('Error', 'Failed to initialize performance view', '❌');
            }
        }
        function handleDateRangeChange() {
            const dateRange = document.getElementById('performanceDateRange').value;
            const customFields = document.getElementById('customDateRangeFields');
            const customFieldsTo = document.getElementById('customDateRangeFieldsTo');
            
            if (dateRange === 'custom') {
                customFields.style.display = 'block';
                customFieldsTo.style.display = 'block';
                
                // Set default dates if empty
                const startInput = document.getElementById('performanceStartDate');
                const endInput = document.getElementById('performanceEndDate');
                
                if (!startInput.value) {
                    const today = new Date();
                    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                    startInput.value = thirtyDaysAgo.toISOString().split('T')[0];
                    endInput.value = today.toISOString().split('T')[0];
                }
            } else {
                customFields.style.display = 'none';
                customFieldsTo.style.display = 'none';
            }
            
            loadPropertyPerformance();
        }
        // Property Performance Functions
       async function loadPropertyPerformance() {
            try {
                // Get filter values
                const propertyId = document.getElementById('performancePropertyFilter').value;
                const dateRange = document.getElementById('performanceDateRange').value;
                const monthFilter = document.getElementById('performanceMonthFilter').value;
                
                // Get all reservations
                let reservations = await db.getReservations();
                
                // Filter by property if selected
                if (propertyId) {
                    reservations = reservations.filter(r => r.property_id == propertyId);
                }
                
                // ⬇️ NEW DATE FILTERING CODE GOES HERE (Section 1C from my previous message)
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                let startDate, endDate;
                let dateRangeLabel = '';

                switch(dateRange) {
                    case 'last30':
                        startDate = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
                        endDate = today;
                        dateRangeLabel = 'Last 30 Days';
                        reservations = reservations.filter(r => {
                            const checkIn = new Date(r.check_in);
                            return checkIn >= startDate && checkIn <= endDate;
                        });
                        break;
                        
                    case 'last90':
                        startDate = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
                        endDate = today;
                        dateRangeLabel = 'Last 90 Days';
                        reservations = reservations.filter(r => {
                            const checkIn = new Date(r.check_in);
                            return checkIn >= startDate && checkIn <= endDate;
                        });
                        break;
                        
                    case 'custom':
                        const customStart = document.getElementById('performanceStartDate').value;
                        const customEnd = document.getElementById('performanceEndDate').value;
                        if (customStart && customEnd) {
                            startDate = new Date(customStart);
                            endDate = new Date(customEnd);
                            endDate.setHours(23, 59, 59, 999);
                            dateRangeLabel = `${formatDate(customStart)} - ${formatDate(customEnd)}`;
                            reservations = reservations.filter(r => {
                                const checkIn = new Date(r.check_in);
                                return checkIn >= startDate && checkIn <= endDate;
                            });
                        } else {
                            dateRangeLabel = 'Custom Range (select dates)';
                        }
                        break;
                        
                    case 'all_time':
                    default:
                        dateRangeLabel = 'All Time';
                        break;
                }
                // ⬆️ END OF NEW DATE FILTERING CODE
                
                // Filter by month if selected
                if (monthFilter) {
                    reservations = reservations.filter(r => {
                        const checkInDate = new Date(r.check_in);
                        const month = checkInDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                        return month === monthFilter;
                    });
                }
                
                // Filter out cancelled bookings for metrics
                const activeReservations = reservations.filter(r => r.status !== 'cancelled');
                
                // Calculate metrics
                const metrics = calculatePerformanceMetrics(activeReservations, propertyId);
                
                // Get properties and payments for charts
                const properties = await db.getProperties();
                const allPayments = await db.getAllPayments();

                // Filter payments to match the filtered reservations
                const reservationIds = activeReservations.map(r => r.id);
                const filteredPayments = allPayments.filter(p => reservationIds.includes(p.reservation_id));

                // Render all sections
                renderPerformanceMetrics(metrics);
                renderPaymentInfo(metrics, activeReservations);

                // Render the charts that were moved from Dashboard
                renderPaymentMethodChart(allPayments, 'performancePaymentMethods');
                renderTopProperties(activeReservations, properties, 'performanceTopProperties');
                renderBookingTypeBreakdown(activeReservations, 'performanceBookingTypes');
                renderChannelPerformance(activeReservations, 'performanceChannels');
                renderMonthlyTrend(activeReservations);
                
                // Show comparison if multiple properties
                if (!propertyId) {
                    await renderPropertyComparison(activeReservations);
                } else {
                    document.getElementById('performanceComparison').style.display = 'none';
                }
                
                // Update filter summary display
                updateFilterSummary();
                
            } catch (error) {
                console.error('Performance load error:', error);
                showToast('Error', 'Failed to load performance data', '❌');
            }
        }

        function updateFilterSummary() {
            const propertyId = document.getElementById('performancePropertyFilter').value;
            const dateRange = document.getElementById('performanceDateRange').value;
            const monthFilter = document.getElementById('performanceMonthFilter').value;
            
            let summaryParts = [];
            
            // Property filter
            if (propertyId) {
                const propertySelect = document.getElementById('performancePropertyFilter');
                const propertyName = propertySelect.options[propertySelect.selectedIndex].text;
                summaryParts.push(`📍 ${propertyName}`);
            } else {
                summaryParts.push('📍 All Properties');
            }
            
            // Date range filter
            switch(dateRange) {
                case 'all_time':
                    summaryParts.push('📅 All Time');
                    break;
                case 'last30':
                    summaryParts.push('📅 Last 30 Days');
                    break;
                case 'last90':
                    summaryParts.push('📅 Last 90 Days');
                    break;
                case 'custom':
                    const start = document.getElementById('performanceStartDate').value;
                    const end = document.getElementById('performanceEndDate').value;
                    if (start && end) {
                        summaryParts.push(`📅 ${formatDate(start)} to ${formatDate(end)}`);
                    }
                    break;
            }
            
            // Month filter
            if (monthFilter) {
                summaryParts.push(`📆 ${monthFilter}`);
            }
            
            document.getElementById('filterSummary').innerHTML = 
                `<strong>Active Filters:</strong> ${summaryParts.join(' • ')}`;
        }
        function calculatePerformanceMetrics(reservations, propertyId) {
            // Total Nights Booked
            const totalNights = reservations.reduce((sum, r) => sum + (r.nights || 0), 0);
            
            // Stay Revenue (stay_amount + extra_guest_charges)
            const stayRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.stay_amount) || 0) + (parseFloat(r.extra_guest_charges) || 0), 0
            );
            
            // Meals Revenue (meals_chef + bonfire_other)
            const mealsRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.meals_chef) || 0) + (parseFloat(r.bonfire_other) || 0), 0
            );
            
            // Total Revenue
            const totalRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.total_amount) || 0), 0
            );
            
            // OTA Service Fees (NEW)
            const totalOtaFees = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.ota_service_fee) || 0), 0
            );
            
            // Net Revenue (after OTA fees)
            const netRevenue = totalRevenue - totalOtaFees;
            
            // Calculate target nights based on property selection
            let targetNights;
            if (propertyId) {
                // Single property: use 200 nights target
                targetNights = TARGET_OCCUPANCY_NIGHTS;
            } else {
                // All properties: count unique properties and multiply
                const uniqueProperties = new Set(reservations.map(r => r.property_id));
                targetNights = TARGET_OCCUPANCY_NIGHTS * uniqueProperties.size;
            }
            
            // Occupancy Rate
            const occupancyRate = targetNights > 0 ? (totalNights / targetNights) * 100 : 0;
            
            // Revenue Performance (revenue per available night) - using net revenue
            const revPAN = targetNights > 0 ? netRevenue / targetNights : 0;
            
            // Average Booking Value
            const avgBookingValue = reservations.length > 0 ? totalRevenue / reservations.length : 0;
            
            // Hostizzy Revenue
            const hostizzyRevenue = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.hostizzy_revenue) || 0), 0
            );
            
            // Payment Information
            const totalPaid = reservations.reduce((sum, r) => 
                sum + (parseFloat(r.paid_amount) || 0), 0
            );
            
            const totalPending = totalRevenue - totalPaid;
            
            return {
                totalNights,
                stayRevenue,
                mealsRevenue,
                totalRevenue,
                totalOtaFees,
                netRevenue,
                occupancyRate,
                revPAN,
                avgBookingValue,
                hostizzyRevenue,
                totalPaid,
                totalPending,
                bookingCount: reservations.length,
                targetNights
            };
        }
        function renderPerformanceMetrics(metrics) {
            const html = `
                <div class="stat-card" style="border-left-color: #3b82f6;">
                    <div class="stat-label">Nights Booked</div>
                    <div class="stat-value">${metrics.totalNights}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Target: ${metrics.targetNights} nights
                    </div>
                </div>
                
                <div class="stat-card" style="border-left-color: #10b981;">
                    <div class="stat-label">Stay Revenue</div>
                    <div class="stat-value">${formatCurrency(metrics.stayRevenue)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Base + Extra Guests
                    </div>
                </div>
                
                <div class="stat-card" style="border-left-color: #f59e0b;">
                    <div class="stat-label">Meals Revenue</div>
                    <div class="stat-value">${formatCurrency(metrics.mealsRevenue)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Meals + Bonfire/Other
                    </div>
                </div>
                
                <div class="stat-card" style="border-left-color: #8b5cf6;">
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-value">${formatCurrency(metrics.totalRevenue)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        ${metrics.bookingCount} bookings
                    </div>
                </div>
                
                ${metrics.totalOtaFees > 0 ? `
                <div class="stat-card" style="border-left-color: #ef4444;">
                    <div class="stat-label">🏢 OTA Fees</div>
                    <div class="stat-value">${formatCurrency(metrics.totalOtaFees)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Commission deductions
                    </div>
                </div>
                
                <div class="stat-card" style="border-left-color: #10b981;">
                    <div class="stat-label">💰 Net Revenue</div>
                    <div class="stat-value">${formatCurrency(metrics.netRevenue)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        After OTA fees
                    </div>
                </div>
                ` : ''}
                
                <div class="stat-card" style="border-left-color: #ec4899;">
                    <div class="stat-label">Occupancy Rate</div>
                    <div class="stat-value">${metrics.occupancyRate.toFixed(1)}%</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        ${metrics.totalNights}/${metrics.targetNights} nights
                    </div>
                </div>
                
                <div class="stat-card" style="border-left-color: #06b6d4;">
                    <div class="stat-label">Revenue/Night</div>
                    <div class="stat-value">${formatCurrency(metrics.revPAN)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        Per Available Night (Net)
                    </div>
                </div>
            `;
            
            document.getElementById('performanceMetrics').innerHTML = html;
        }
        function renderPaymentInfo(metrics, reservations) {
            const ownerRevenue = metrics.netRevenue - metrics.hostizzyRevenue;
            const hostizzyPercent = metrics.netRevenue > 0 ? 
                ((metrics.hostizzyRevenue / metrics.netRevenue) * 100).toFixed(1) : 0;
            const ownerPercent = metrics.netRevenue > 0 ? 
                ((ownerRevenue / metrics.netRevenue) * 100).toFixed(1) : 0;
            
            const collectionRate = metrics.totalRevenue > 0 ? 
                ((metrics.totalPaid / metrics.totalRevenue) * 100).toFixed(1) : 0;
            
            const html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                    <!-- Payment Collection -->
                    <div style="padding: 20px; background: var(--background); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            💰 Total Collected
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: var(--success); margin-bottom: 4px;">
                            ${formatCurrency(metrics.totalPaid)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${collectionRate}% collection rate
                        </div>
                    </div>
                    
                    <!-- Pending Amount -->
                    <div style="padding: 20px; background: var(--background); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            ⏳ Pending Collection
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: var(--danger); margin-bottom: 4px;">
                            ${formatCurrency(metrics.totalPending)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${(100 - collectionRate).toFixed(1)}% remaining
                        </div>
                    </div>
                    
                    ${metrics.totalOtaFees > 0 ? `
                    <!-- OTA Fees -->
                    <div style="padding: 20px; background: var(--background); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            🏢 OTA Service Fees
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: var(--danger); margin-bottom: 4px;">
                            ${formatCurrency(metrics.totalOtaFees)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            Commission deductions
                        </div>
                    </div>
                    ` : ''}
                    
                    <!-- Hostizzy Revenue -->
                    <div style="padding: 20px; background: var(--background); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            🏢 Hostizzy Revenue
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: var(--primary); margin-bottom: 4px;">
                            ${formatCurrency(metrics.hostizzyRevenue)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${hostizzyPercent}% of net revenue
                        </div>
                    </div>
                    
                    <!-- Owner Revenue -->
                    <div style="padding: 20px; background: var(--background); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            🏠 Owner Revenue
                        </div>
                        <div style="font-size: 28px; font-weight: 700; color: #059669; margin-bottom: 4px;">
                            ${formatCurrency(ownerRevenue)}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">
                            ${ownerPercent}% of net revenue
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('performancePaymentInfo').innerHTML = html;
        }
        
        function renderChannelPerformance(reservations) {
            const channels = {};
            
            reservations.forEach(r => {
                const channel = r.booking_source || 'DIRECT';
                if (!channels[channel]) {
                    channels[channel] = { count: 0, revenue: 0, avgValue: 0 };
                }
                channels[channel].count++;
                channels[channel].revenue += parseFloat(r.total_amount) || 0;
            });
            
            // Calculate average values
            Object.keys(channels).forEach(channel => {
                channels[channel].avgValue = channels[channel].count > 0 ? 
                    channels[channel].revenue / channels[channel].count : 0;
            });
            
            const sortedChannels = Object.entries(channels)
                .sort((a, b) => b[1].revenue - a[1].revenue);
            
            const totalRevenue = reservations.reduce((sum, r) => sum + (parseFloat(r.total_amount) || 0), 0);
            const totalCount = reservations.length;
            
            if (sortedChannels.length === 0) {
                document.getElementById('performanceChannels').innerHTML = 
                    '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No channel data available</div>';
                return;
            }
            
            const channelColors = {
                'DIRECT': '#2563eb',
                'AIRBNB': '#ff5a5f',
                'AGODA/BOOKING.COM': '#003580',
                'MMT/GOIBIBO': '#f15b2a',
                'OTHER': '#6b7280'
            };
            
            const html = sortedChannels.map(([channel, data]) => {
                const percentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : 0;
                const countPercentage = totalCount > 0 ? ((data.count / totalCount) * 100).toFixed(1) : 0;
                const color = channelColors[channel] || '#6b7280';
                
                return `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <div>
                                <div style="font-weight: 600; font-size: 15px;">${channel}</div>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    ${data.count} bookings (${countPercentage}%) • Avg: ₹${Math.round(data.avgValue).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: 700; font-size: 18px; color: ${color};">
                                    ₹${(data.revenue/100000).toFixed(1)}L
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    ${percentage}% of revenue
                                </div>
                            </div>
                        </div>
                        <div style="background: var(--background); height: 12px; border-radius: 6px; overflow: hidden;">
                            <div style="width: ${percentage}%; height: 100%; background: ${color}; transition: width 0.5s;"></div>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('performanceChannels').innerHTML = html;
        }
        function renderMonthlyTrend(reservations) {
            const monthlyData = {};
            
            reservations.forEach(r => {
                const month = r.month || new Date(r.check_in).toLocaleString('en-US', { month: 'short', year: 'numeric' });
                if (!monthlyData[month]) {
                    monthlyData[month] = {
                        bookings: 0,
                        nights: 0,
                        stayRevenue: 0,
                        mealsRevenue: 0,
                        totalRevenue: 0
                    };
                }
                monthlyData[month].bookings++;
                monthlyData[month].nights += r.nights || 0;
                monthlyData[month].stayRevenue += (parseFloat(r.stay_amount) || 0) + (parseFloat(r.extra_guest_charges) || 0);
                monthlyData[month].mealsRevenue += (parseFloat(r.meals_chef) || 0) + (parseFloat(r.bonfire_other) || 0);
                monthlyData[month].totalRevenue += parseFloat(r.total_amount) || 0;
            });
            
            const sortedMonths = Object.entries(monthlyData)
                .sort((a, b) => {
                    const dateA = new Date(a[0]);
                    const dateB = new Date(b[0]);
                    return dateA - dateB;
                });
            
            if (sortedMonths.length === 0) {
                document.getElementById('performanceMonthlyTrend').innerHTML = 
                    '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No monthly data available</div>';
                return;
            }
            
            const html = `
                <div style="overflow-x: auto;">
                    <table style="width: 100%; min-width: 800px;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border);">
                                <th style="text-align: left; padding: 12px;">Month</th>
                                <th style="text-align: center; padding: 12px;">Bookings</th>
                                <th style="text-align: center; padding: 12px;">Nights</th>
                                <th style="text-align: right; padding: 12px;">Stay Revenue</th>
                                <th style="text-align: right; padding: 12px;">Meals Revenue</th>
                                <th style="text-align: right; padding: 12px;">Total Revenue</th>
                                <th style="text-align: center; padding: 12px;">Avg/Booking</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedMonths.map(([month, data]) => {
                                const avgBookingValue = data.bookings > 0 ? data.totalRevenue / data.bookings : 0;
                                const occupancyPercent = (data.nights / TARGET_OCCUPANCY_NIGHTS * 100).toFixed(1);
                                
                                return `
                                    <tr style="border-bottom: 1px solid var(--border);">
                                        <td style="padding: 12px; font-weight: 600;">${month}</td>
                                        <td style="text-align: center; padding: 12px;">${data.bookings}</td>
                                        <td style="text-align: center; padding: 12px;">
                                            ${data.nights}
                                            <div style="font-size: 11px; color: var(--text-secondary);">${occupancyPercent}%</div>
                                        </td>
                                        <td style="text-align: right; padding: 12px;">₹${(data.stayRevenue/100000).toFixed(1)}L</td>
                                        <td style="text-align: right; padding: 12px;">₹${(data.mealsRevenue/100000).toFixed(1)}L</td>
                                        <td style="text-align: right; padding: 12px; font-weight: 700; color: var(--success);">
                                            ₹${(data.totalRevenue/100000).toFixed(1)}L
                                        </td>
                                        <td style="text-align: center; padding: 12px;">₹${Math.round(avgBookingValue).toLocaleString('en-IN')}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            
            document.getElementById('performanceMonthlyTrend').innerHTML = html;
        }
        async function renderPropertyComparison(reservations) {
            try {
                const properties = await db.getProperties();
                
                if (properties.length <= 1) {
                    document.getElementById('performanceComparison').style.display = 'none';
                    return;
                }
                
                document.getElementById('performanceComparison').style.display = 'block';
                
                const comparisonData = properties.map(property => {
                    const propertyReservations = reservations.filter(r => r.property_id === property.id);
                    const metrics = calculatePerformanceMetrics(propertyReservations, property.id);
                    
                    return {
                        property: property,
                        metrics: metrics
                    };
                }).sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue);
                
                const html = `
                    <div style="overflow-x: auto;">
                        <table style="width: 100%; min-width: 1000px;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border);">
                                    <th style="text-align: left; padding: 12px;">Property</th>
                                    <th style="text-align: center; padding: 12px;">Bookings</th>
                                    <th style="text-align: center; padding: 12px;">Nights</th>
                                    <th style="text-align: center; padding: 12px;">Occupancy</th>
                                    <th style="text-align: right; padding: 12px;">Stay Revenue</th>
                                    <th style="text-align: right; padding: 12px;">Meals Revenue</th>
                                    <th style="text-align: right; padding: 12px;">Total Revenue</th>
                                    <th style="text-align: right; padding: 12px;">Hostizzy Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${comparisonData.map((item, index) => {
                                    const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                                    
                                    return `
                                        <tr style="border-bottom: 1px solid var(--border);">
                                            <td style="padding: 12px;">
                                                <div style="font-weight: 600;">${rankEmoji} ${item.property.name}</div>
                                                <div style="font-size: 12px; color: var(--text-secondary);">${item.property.location}</div>
                                            </td>
                                            <td style="text-align: center; padding: 12px;">${item.metrics.bookingCount}</td>
                                            <td style="text-align: center; padding: 12px;">${item.metrics.totalNights}</td>
                                            <td style="text-align: center; padding: 12px;">
                                                <span style="font-weight: 600; color: ${item.metrics.occupancyRate >= 50 ? 'var(--success)' : 'var(--warning)'}">
                                                    ${item.metrics.occupancyRate.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td style="text-align: right; padding: 12px;">₹${(item.metrics.stayRevenue/100000).toFixed(1)}L</td>
                                            <td style="text-align: right; padding: 12px;">₹${(item.metrics.mealsRevenue/100000).toFixed(1)}L</td>
                                            <td style="text-align: right; padding: 12px; font-weight: 700; color: var(--success);">
                                                ₹${(item.metrics.totalRevenue/100000).toFixed(1)}L
                                            </td>
                                            <td style="text-align: right; padding: 12px; font-weight: 700; color: var(--primary);">
                                                ₹${(item.metrics.hostizzyRevenue/100000).toFixed(1)}L
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
                
                document.getElementById('performanceComparisonContent').innerHTML = html;
            } catch (error) {
                console.error('Property comparison error:', error);
            }
        }
        async function exportPerformanceReport() {
            try {
                const propertyId = document.getElementById('performancePropertyFilter').value;
                const propertyName = propertyId ? 
                    (await db.getProperties()).find(p => p.id == propertyId)?.name || 'All Properties' : 
                    'All Properties';
                
                let reservations = await db.getReservations();
                
                // Apply same filters as current view
                if (propertyId) {
                    reservations = reservations.filter(r => r.property_id == propertyId);
                }
                
                const activeReservations = reservations.filter(r => r.status !== 'cancelled');
                
                let csv = `Hostizzy Performance Report - ${propertyName}\n`;
                csv += `Generated: ${new Date().toLocaleString('en-IN')}\n\n`;
                
                csv += 'Month,Bookings,Nights,Stay Revenue,Meals Revenue,Total Revenue,Booking Type,Channel\n';
                
                activeReservations.forEach(r => {
                    csv += [
                        r.month || '',
                        1,
                        r.nights || 0,
                        (parseFloat(r.stay_amount) || 0) + (parseFloat(r.extra_guest_charges) || 0),
                        (parseFloat(r.meals_chef) || 0) + (parseFloat(r.bonfire_other) || 0),
                        r.total_amount || 0,
                        r.booking_type || 'STAYCATION',
                        r.booking_source || 'DIRECT'
                    ].map(v => `"${v}"`).join(',') + '\n';
                });
                
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `hostizzy-performance-${propertyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                
                showToast('Exported', 'Performance report downloaded', '📥');
            } catch (error) {
                console.error('Export error:', error);
                showToast('Export Failed', error.message, '❌');
            }
        }
        // Team
        async function loadTeam() {
            try {
                const members = await db.getTeamMembers();
                const tbody = document.getElementById('teamTableBody');
                
                tbody.innerHTML = members.map(m => `
                    <tr>
                        <td>${m.name}</td>
                        <td>${m.email}</td>
                        <td><span class="badge badge-confirmed">${m.role.toUpperCase()}</span></td>
                        <td><span class="badge ${m.is_active ? 'badge-confirmed' : 'badge-cancelled'}">${m.is_active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                        <td>
                            <button class="btn btn-danger btn-sm" onclick="deleteTeamMember(${m.id})">Remove</button>
                        </td>
                    </tr>
                `).join('');
            } catch (error) {
                console.error('Team error:', error);
                showToast('Error', 'Failed to load team', '❌');
            }
        }

        function openTeamModal() {
            document.getElementById('teamModal').classList.add('active');
        }

        function closeTeamModal() {
            document.getElementById('teamModal').classList.remove('active');
            document.getElementById('teamMemberName').value = '';
            document.getElementById('teamMemberEmail').value = '';
            document.getElementById('teamMemberPassword').value = '';
        }

        async function saveTeamMember() {
            try {
                const member = {
                    name: document.getElementById('teamMemberName').value,
                    email: document.getElementById('teamMemberEmail').value,
                    password: document.getElementById('teamMemberPassword').value,
                    role: document.getElementById('teamMemberRole').value,
                    is_active: true
                };
                
                if (!member.name || !member.email || !member.password) {
                    showToast('Validation Error', 'Please fill in all required fields', '❌');
                    return;
                }
                
                await db.saveTeamMember(member);
                closeTeamModal();
                await loadTeam();
                showToast('Success', 'Team member added!', '✅');
            } catch (error) {
                console.error('Save team member error:', error);
                showToast('Error', 'Failed to save team member', '❌');
            }
        }

        async function deleteTeamMember(id) {
            if (!confirm('Remove this team member?')) return;
            
            try {
                await db.deleteTeamMember(id);
                await loadTeam();
                showToast('Removed', 'Team member removed successfully', '✅');
            } catch (error) {
                console.error('Delete team member error:', error);
                showToast('Error', 'Failed to remove team member', '❌');
            }
        }

        // ========== MEALS MANAGEMENT ==========
        
        async function loadMeals() {
            try {
                // Fetch all meal preferences (now combined format)
                const { data: mealData, error: mealError } = await supabase
                    .from('guest_meal_preferences')
                    .select(`
                        id,
                        booking_id,
                        meals,
                        dietary_preferences,
                        special_requests,
                        status,
                        submitted_at,
                        approved_by,
                        approved_at,
                        rejected_reason
                    `)
                    .order('submitted_at', { ascending: false });

                if (mealError) throw mealError;

                // Fetch all reservations for mapping booking_id to guest info
                const { data: reservations, error: resError } = await supabase
                    .from('reservations')
                    .select('booking_id, property_id, guest_name, guest_phone, check_in, check_out, adults, kids');

                if (resError) throw resError;

                // Create lookup map for reservation data
                const reservationMap = {};
                reservations.forEach(r => {
                    reservationMap[r.booking_id] = r;
                });

                // Update stats - count unique bookings
                const pending = mealData.filter(m => m.status === 'pending').length;
                const approved = mealData.filter(m => m.status === 'approved').length;
                const rejected = mealData.filter(m => m.status === 'rejected').length;

                document.getElementById('mealStatPending').textContent = pending;
                document.getElementById('mealStatApproved').textContent = approved;
                document.getElementById('mealStatRejected').textContent = rejected;

                // Render meals list
                renderMealsList(mealData, reservationMap);

            } catch (error) {
                console.error('Meals error:', error);
                showToast('Error', 'Failed to load meals', '❌');
            }
        }

         function renderMealsList(mealData, reservationMap) {
            const container = document.getElementById('mealsList');

            if (mealData.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">No meal preferences found</div>';
                return;
            }

            const html = mealData.map(mealPref => {
                const bookingId = mealPref.booking_id;
                const reservation = reservationMap[bookingId] || {};
                const status = mealPref.status || 'pending';
                const meals = mealPref.meals || {};
                
                const statusBadge = {
                    'pending': '<span class="badge badge-pending">⏳ Pending</span>',
                    'approved': '<span class="badge badge-confirmed">✅ Approved</span>',
                    'rejected': '<span class="badge badge-cancelled">❌ Rejected</span>'
                }[status] || '<span class="badge">Unknown</span>';

                // Format dates
                const checkIn = reservation.check_in ? new Date(reservation.check_in).toLocaleDateString('en-IN') : 'N/A';
                const checkOut = reservation.check_out ? new Date(reservation.check_out).toLocaleDateString('en-IN') : 'N/A';
                const adults = reservation.adults || 0;
                const kids = reservation.kids || 0;

                // Build meals summary with proper formatting
                const mealsSummary = Object.entries(meals)
                    .map(([mealType, items]) => {
                        if (!Array.isArray(items)) return '';
                        const mealEmoji = {
                            'breakfast': '🌅',
                            'lunch': '🍲',
                            'dinner': '🍜',
                            'barbeque': '🔥'
                        }[mealType] || '🍽️';
                        const itemsList = items.join(', ');
                        return `<div style="margin-bottom: 8px;"><strong>${mealEmoji} ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}:</strong> ${itemsList}</div>`;
                    })
                    .join('');

                // Build info section
                const infoSection = `
                    <div style="background: var(--background); padding: 12px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; line-height: 1.8;">
                        <div><strong>📅 Check-in:</strong> ${checkIn}</div>
                        <div><strong>📅 Check-out:</strong> ${checkOut}</div>
                        <div><strong>👥 Guests:</strong> ${adults} Adults, ${kids} kids</div>
                    </div>
                `;

                // Build dietary and special requests
                const dietaryInfo = mealPref.dietary_preferences 
                    ? `<div style="background: #e6f4ea; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid var(--success); font-size: 13px;">🥗 <strong>Dietary:</strong> ${mealPref.dietary_preferences}</div>`
                    : '';

                const specialInfo = mealPref.special_requests
                    ? `<div style="background: #fef7e0; padding: 12px; border-radius: 8px; border-left: 4px solid var(--warning); font-size: 13px;">⭐ <strong>Special Requests:</strong> ${mealPref.special_requests}</div>`
                    : '';

                return `
                    <div style="
                        background: var(--surface);
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    ">
                        <!-- Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div>
                                <div style="font-weight: 700; font-size: 16px;">Booking: ${bookingId}</div>
                                <div style="color: var(--text-secondary); font-size: 13px; margin-top: 2px;">Guest: ${reservation.guest_name || 'N/A'} | Phone: ${reservation.guest_phone || 'N/A'}</div>
                            </div>
                            ${statusBadge}
                        </div>

                        <!-- Info Section -->
                        ${infoSection}

                        <!-- Meals -->
                        <div style="background: var(--surface); padding: 12px; border-radius: 8px; border-left: 4px solid var(--primary); margin-bottom: 12px; font-size: 13px;">
                            🍽️ <strong>Meal Selections:</strong>
                            <div style="margin-top: 8px;">
                                ${mealsSummary}
                            </div>
                        </div>

                        <!-- Dietary & Special -->
                        ${dietaryInfo}
                        ${specialInfo}

                        <!-- Action Buttons -->
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                            ${status === 'pending' ? `
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-success btn-sm" onclick="approveMeal('${mealPref.id}', '${bookingId}')" style="flex: 1;">
                                        ✅ Approve
                                    </button>
                                    <button class="btn btn-danger btn-sm" onclick="showRejectMealModal('${mealPref.id}', '${bookingId}')" style="flex: 1;">
                                        ❌ Reject
                                    </button>
                                </div>
                                <button class="btn btn-primary btn-sm" onclick="sendMealWhatsApp('${bookingId}', '${reservation.guest_phone || ''}', 'approval')" style="width: 100%;">
                                    💬 WhatsApp Approval
                                </button>
                            ` : status === 'rejected' ? `
                                <button class="btn btn-warning btn-sm" onclick="unrejectMeal('${mealPref.id}')" style="width: 100%;">
                                    🔄 Unreject
                                </button>
                            ` : `
                                <div style="text-align: center; color: var(--text-secondary); font-size: 13px; padding: 12px; background: var(--background); border-radius: 8px;">
                                    ✅ Approved by staff
                                </div>
                            `}
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
        }

        function searchMeals(query) {
            const items = document.querySelectorAll('#mealsList > div');
            const lowerQuery = query.toLowerCase();
            
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(lowerQuery) ? 'flex' : 'none';
            });
        }

        function filterMealsByStatus(status) {
            loadMeals(); // For now, reload - can be optimized with client-side filtering
        }

        function refreshMeals() {
            loadMeals();
            showToast('Refreshed', 'Meals list updated', '✅');
        }

         async function approveMeal(mealId, bookingId) {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const staffId = currentUser?.email || 'unknown';

                const { error } = await supabase
                    .from('guest_meal_preferences')
                    .update({
                        status: 'approved',
                        approved_by: staffId,
                        approved_at: new Date().toISOString()
                    })
                    .eq('id', mealId);

                if (error) throw error;

                // Get guest phone and details for WhatsApp
                const { data: reservation } = await supabase
                    .from('reservations')
                    .select('guest_name, guest_phone, check_in, check_out, adults, kids')
                    .eq('booking_id', bookingId)
                    .maybeSingle();

                loadMeals();
                showToast('Approved', `Meal preference approved for ${bookingId}`, '✅');

                // Auto-open WhatsApp with approval message
                if (reservation?.guest_phone) {
                    setTimeout(() => {
                        sendApprovalWhatsApp(bookingId, reservation.guest_phone, reservation.guest_name, reservation.check_in, reservation.check_out, reservation.adults, reservation.kids);
                    }, 500);
                }
            } catch (error) {
                console.error('Approve meal error:', error);
                showToast('Error', 'Failed to approve meal', '❌');
            }
        }

        function showRejectMealModal(mealId, bookingId) {
            // Show custom modal instead of prompt
            const modal = document.createElement('div');
            modal.id = 'rejectReasonModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                ">
                    <h3 style="margin-bottom: 16px; color: var(--text-primary);">Reject Meal Preference</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 16px; font-size: 14px;">
                        Enter rejection reason (optional):
                    </p>
                    <textarea id="rejectReasonInput" placeholder="e.g., Unable to source required ingredients" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        font-size: 14px;
                        font-family: inherit;
                        resize: vertical;
                        min-height: 80px;
                        margin-bottom: 16px;
                    "></textarea>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button onclick="document.getElementById('rejectReasonModal').remove()" class="btn btn-secondary" style="flex: 1;">
                            Cancel
                        </button>
                        <button onclick="proceedWithReject('${mealId}', '${bookingId}')" class="btn btn-danger" style="flex: 1;">
                            Reject
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            document.getElementById('rejectReasonInput').focus();
        }

        function proceedWithReject(mealId, bookingId) {
            const reason = document.getElementById('rejectReasonInput')?.value || '';
            document.getElementById('rejectReasonModal').remove();
            rejectMeal(mealId, bookingId, reason);
        }

        async function rejectMeal(mealId, bookingId, reason = '') {
            try {
                const currentUser = JSON.parse(localStorage.getItem('currentUser'));
                const staffId = currentUser?.email || 'unknown';

                const { error } = await supabase
                    .from('guest_meal_preferences')
                    .update({
                        status: 'rejected',
                        approved_by: staffId,
                        approved_at: new Date().toISOString(),
                        rejected_reason: reason
                    })
                    .eq('id', mealId);

                if (error) throw error;

                // Get guest phone and details for WhatsApp
                const { data: reservation } = await supabase
                    .from('reservations')
                    .select('guest_name, guest_phone, check_in, check_out, adults, kids')
                    .eq('booking_id', bookingId)
                    .maybeSingle();

                loadMeals();
                showToast('Rejected', `Meal preference rejected for ${bookingId}`, '✅');

                // Auto-open WhatsApp with rejection message
                if (reservation?.guest_phone) {
                    setTimeout(() => {
                        sendRejectionWhatsApp(bookingId, reservation.guest_phone, reason, reservation.guest_name, reservation.check_in, reservation.check_out, reservation.adults, reservation.kids);
                    }, 500);
                }
            } catch (error) {
                console.error('Reject meal error:', error);
                showToast('Error', 'Failed to reject meal', '❌');
            }
        }

        function sendApprovalWhatsApp(bookingId, guestPhone, guestName, checkIn, checkOut, adults, kids) {
            try {
                if (!guestPhone) {
                    showToast('Error', 'Guest phone number not available', '❌');
                    return;
                }

                const checkInDate = checkIn ? new Date(checkIn).toLocaleDateString('en-IN') : 'TBD';
                const checkOutDate = checkOut ? new Date(checkOut).toLocaleDateString('en-IN') : 'TBD';

                const message = `🎉 *Meal Preferences Confirmed* 🎉\n\n` +
                    `Hi ${guestName}!\n\n` +
                    `✅ Your meal preferences for booking *${bookingId}* have been *APPROVED*!\n\n` +
                    `📅 *Booking Details:*\n` +
                    `• Check-in: ${checkInDate}\n` +
                    `• Check-out: ${checkOutDate}\n` +
                    `• Guests: ${adults} Adults, ${kids} kids\n\n` +
                    `🍽️ Our team will prepare everything exactly as per your requirements.\n\n` +
                    `If you have any last-minute changes, please let us know ASAP.\n\n` +
                    `Looking forward to hosting you! 🏡\n\n` +
                    `*Hostizzy Team*`;

                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${guestPhone}?text=${encodedMessage}`;

                // Create button container for WhatsApp and Copy options
                showWhatsAppOptions(message, whatsappUrl);

            } catch (error) {
                console.error('WhatsApp approval error:', error);
                showToast('Error', 'Failed to prepare message', '❌');
            }
        }

        function sendRejectionWhatsApp(bookingId, guestPhone, reason, guestName, checkIn, checkOut, adults, kids) {
            try {
                if (!guestPhone) {
                    showToast('Error', 'Guest phone number not available', '❌');
                    return;
                }

                const checkInDate = checkIn ? new Date(checkIn).toLocaleDateString('en-IN') : 'TBD';
                const checkOutDate = checkOut ? new Date(checkOut).toLocaleDateString('en-IN') : 'TBD';
                const guestPortalLink = `${window.location.origin}/guest-portal.html`;

                let message = `⚠️ *Meal Preferences - Action Needed* ⚠️\n\n` +
                    `Hi ${guestName}!\n\n` +
                    `We need to discuss your meal preferences for booking *${bookingId}*.\n\n` +
                    `📅 *Booking Details:*\n` +
                    `• Check-in: ${checkInDate}\n` +
                    `• Check-out: ${checkOutDate}\n` +
                    `• Guests: ${adults} Adults, ${kids} kids\n\n`;

                if (reason) {
                    message += `*Reason:* ${reason}\n\n`;
                }

                message += `Please update your meal preferences via the guest portal and resubmit:\n` +
                    `${guestPortalLink}\n\n` +
                    `📞 We're here to help!\n\n` +
                    `*Hostizzy Team*`;

                const encodedMessage = encodeURIComponent(message);
                const whatsappUrl = `https://wa.me/${guestPhone}?text=${encodedMessage}`;

                // Create button container for WhatsApp and Copy options
                showWhatsAppOptions(message, whatsappUrl);

            } catch (error) {
                console.error('WhatsApp rejection error:', error);
                showToast('Error', 'Failed to prepare message', '❌');
            }
        }

        function showWhatsAppOptions(message, whatsappUrl) {
            // Create modal with WhatsApp and Copy buttons
            const modal = document.createElement('div');
            modal.id = 'whatsappOptionsModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(4px);
            `;

            modal.innerHTML = `
                <div style="
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                ">
                    <h3 style="margin-bottom: 16px; color: var(--text-primary); display: flex; gap: 8px; align-items: center;">
                        💬 Message Preview
                    </h3>
                    <div style="
                        background: var(--background);
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 20px;
                        max-height: 300px;
                        overflow-y: auto;
                        font-size: 13px;
                        line-height: 1.6;
                        color: var(--text-primary);
                        white-space: pre-wrap;
                        word-break: break-word;
                    " id="messagePreview">
                        ${message}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <button onclick="openWhatsAppDirect('${whatsappUrl.replace(/'/g, "\\'")}'); document.getElementById('whatsappOptionsModal').remove()" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 600;">
                            💚 Open WhatsApp
                        </button>
                        <button onclick="copyMessageToClipboard(\`${message.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`); document.getElementById('whatsappOptionsModal').remove()" class="btn btn-secondary" style="width: 100%; padding: 12px; font-weight: 600;">
                            📋 Copy to Clipboard
                        </button>
                        <button onclick="document.getElementById('whatsappOptionsModal').remove()" class="btn btn-secondary" style="width: 100%; padding: 12px; font-weight: 600;">
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        function openWhatsAppDirect(whatsappUrl) {
            window.open(whatsappUrl, '_blank', 'width=800,height=600');
            showToast('WhatsApp Opened', 'Message ready to send', '✅');
        }

        async function copyMessageToClipboard(message) {
            try {
                await navigator.clipboard.writeText(message);
                showToast('Copied', 'Message copied to clipboard! Paste it in WhatsApp.', '✅');
            } catch (error) {
                console.error('Copy error:', error);
                showToast('Error', 'Failed to copy message', '❌');
            }
        }

        async function sendMealWhatsApp(bookingId, guestPhone, actionType) {
            try {
                if (!guestPhone) {
                    showToast('Error', 'Guest phone number not available', '❌');
                    return;
                }

                if (actionType === 'approval') {
                    sendApprovalWhatsApp(bookingId, guestPhone);
                } else if (actionType === 'rejection') {
                    sendRejectionWhatsApp(bookingId, guestPhone, '');
                }
            } catch (error) {
                console.error('WhatsApp send error:', error);
                showToast('Error', 'Failed to open WhatsApp', '❌');
            }
        }
        
        // Availability Calendar
        let currentCalendarDate = new Date();

        /**
         * Show property calendar - switches to availability view and filters by property
         */
        async function showPropertyCalendar(propertyId) {
            try {
                // Switch to availability view using the correct function
                showView('availability');
                
                // Small delay to let the view switch complete
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Set property filter
                const propertyFilter = document.getElementById('calendarPropertyFilter');
                if (propertyFilter) {
                    propertyFilter.value = propertyId;
                }
                
                // Load calendar with filter
                await loadAvailabilityCalendar();
                
                // Scroll to calendar
                const availabilityView = document.getElementById('availabilityView');
                if (availabilityView) {
                    availabilityView.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
            } catch (error) {
                console.error('Error showing property calendar:', error);
                showToast('Failed to open calendar', 'error');
            }
        }

        async function loadAvailabilityCalendar() {
            const reservations = await db.getReservations();
            const properties = await db.getProperties();
            
            const propertyFilter = document.getElementById('calendarPropertyFilter');
            if (propertyFilter && propertyFilter.children.length === 1) {
                propertyFilter.innerHTML = '<option value="">All Properties</option>' + 
                    properties.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            }
            
            currentPropertyFilter = propertyFilter.value;
            
            let filteredReservations = reservations.filter(r => r.status !== 'cancelled');
            if (currentPropertyFilter) {
                filteredReservations = filteredReservations.filter(r => r.property_id == currentPropertyFilter);
            }
            
            // Fetch synced availability dates (OTA blocked dates)
            let syncedDates = [];
            try {
                if (currentPropertyFilter) {
                    const { data: syncedData, error: syncError } = await supabase
                        .from('synced_availability')
                        .select('*')
                        .eq('property_id', currentPropertyFilter);
                    
                    if (!syncError && syncedData) {
                        syncedDates = syncedData;
                    }
                }
            } catch (error) {
                console.error('Error fetching synced dates:', error);
            }
            
            renderCalendar(filteredReservations, syncedDates);
        }
        
        function renderCalendar(reservations, syncedDates = []) {
            const year = currentCalendarDate.getFullYear();
            const month = currentCalendarDate.getMonth();
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
            
            // Build bookings map (direct bookings)
            const bookingsMap = {};
            reservations.forEach(r => {
                const checkIn = new Date(r.check_in);
                const checkOut = new Date(r.check_out);
                let currentDate = new Date(checkIn);
                
                while (currentDate <= checkOut) {
                    if (currentDate.getMonth() === month && currentDate.getFullYear() === year) {
                        const day = currentDate.getDate();
                        if (!bookingsMap[day]) bookingsMap[day] = [];
                        bookingsMap[day].push(r);
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });
            
            // Build synced dates map (OTA blocked dates)
            const syncedMap = {};
            console.log('🔍 Debug: Total synced dates:', syncedDates.length);
            syncedDates.forEach(sd => {
                try {
                    console.log('📅 Processing date:', sd.blocked_date);
                    
                    // Handle date string - remove time component if present
                    let dateStr = sd.blocked_date;
                    if (dateStr.includes('T')) {
                        dateStr = dateStr.split('T')[0];
                    }
                    
                    // Parse date string directly without timezone conversion
                    const dateParts = dateStr.split('-');
                    const blockedYear = parseInt(dateParts[0]);
                    const blockedMonth = parseInt(dateParts[1]) - 1; // Month is 0-indexed
                    const blockedDay = parseInt(dateParts[2]);
                    
                    console.log(`   Year: ${blockedYear}, Month: ${blockedMonth} (viewing: ${month}), Day: ${blockedDay}`);
                    
                    if (blockedMonth === month && blockedYear === year) {
                        console.log(`   ✅ Added to calendar day ${blockedDay}`);
                        if (!syncedMap[blockedDay]) syncedMap[blockedDay] = [];
                        syncedMap[blockedDay].push(sd);
                    }
                } catch (error) {
                    console.warn('Error parsing synced date:', sd.blocked_date, error);
                }
            });
            console.log('🗺️ Final syncedMap:', syncedMap);
            
            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();
            
            let calendarHTML = '';
            
            ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                calendarHTML += `<div class="calendar-day-header">${day}</div>`;
            });
            
            for (let i = 0; i < firstDay; i++) {
                calendarHTML += '<div class="calendar-day empty"></div>';
            }
            
            for (let day = 1; day <= daysInMonth; day++) {
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
                const hasBooking = bookingsMap[day] && bookingsMap[day].length > 0;
                const hasSynced = syncedMap[day] && syncedMap[day].length > 0;
                const bookingCount = hasBooking ? bookingsMap[day].length : 0;
                const syncedCount = hasSynced ? syncedMap[day].length : 0;
                
                // Determine day styling based on booking type
                let dayClass = '';
                let dayStyle = '';
                let indicator = '';
                
                if (hasBooking) {
                    dayClass = 'has-booking';
                    dayStyle = 'background: #fee2e2; border-left: 4px solid #dc2626;';
                    indicator = `<div style="font-size: 10px; color: #dc2626; font-weight: 600; margin-top: 2px;">🔴 ${bookingCount}</div>`;
                } else if (hasSynced) {
                    dayClass = 'has-synced';
                    dayStyle = 'background: #fef3c7; border-left: 4px solid #f59e0b;';
                    indicator = `<div style="font-size: 10px; color: #f59e0b; font-weight: 600; margin-top: 2px;">🟡 ${syncedCount}</div>`;
                }
                
                const tooltip = hasBooking ? `${bookingCount} direct booking(s)` : (hasSynced ? `${syncedCount} OTA block(s)` : 'Available');
                
                calendarHTML += `
                    <div class="calendar-day ${isToday ? 'today' : ''} ${dayClass}" 
                        style="${dayStyle}"
                        onclick="showDayBookings(${day}, ${month}, ${year})"
                        title="${tooltip}">
                        <div style="font-weight: 600;">${day}</div>
                        ${indicator}
                    </div>
                `;
            }
            
            document.getElementById('calendarGrid').innerHTML = calendarHTML;
        }
        
        async function showDayBookings(day, month, year) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const todayBookingsEl = document.getElementById('todayBookings');
            
            try {
                // Get all reservations for this date
                const reservations = await db.getReservations();
                const propertyFilter = document.getElementById('calendarPropertyFilter').value;
                
                // Filter reservations for the selected date
                const dayBookings = reservations.filter(r => {
                    if (r.status === 'cancelled') return false;
                    if (propertyFilter && r.property_id != propertyFilter) return false;
                    
                    const checkIn = new Date(r.check_in);
                    const checkOut = new Date(r.check_out);
                    const selectedDate = new Date(dateStr);
                    
                    return selectedDate >= checkIn && selectedDate <= checkOut;
                });
                
                // Get synced availability for this date
                let syncedBlocks = [];
                if (propertyFilter) {
                    const { data: syncedData } = await supabase
                        .from('synced_availability')
                        .select('*')
                        .eq('property_id', propertyFilter)
                        .eq('blocked_date', dateStr);
                    
                    if (syncedData) syncedBlocks = syncedData;
                }
                
                // Build HTML
                let html = `<div style="font-weight: 600; margin-bottom: 12px; font-size: 16px;">📅 ${dateStr}</div>`;
                
                // Show direct bookings
                if (dayBookings.length > 0) {
                    html += `<div style="margin-bottom: 16px;">
                        <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px;">🔴 Direct Bookings (${dayBookings.length})</div>`;
                    
                    dayBookings.forEach(booking => {
                        html += `
                            <div style="padding: 12px; background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 6px; margin-bottom: 8px; cursor: pointer;" onclick="viewReservation('${booking.booking_id}')">
                                <div style="font-weight: 600; color: #1e293b;">${booking.guest_name}</div>
                                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                    ${booking.check_in} → ${booking.check_out} (${booking.nights} nights)
                                </div>
                                <div style="font-size: 13px; color: #64748b;">
                                    Property: ${booking.property_name || 'Unknown'}
                                </div>
                                <div style="font-size: 13px; color: #16a34a; font-weight: 600; margin-top: 4px;">
                                    ₹${parseFloat(booking.total_amount || 0).toLocaleString()}
                                </div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                // Show OTA blocks
                if (syncedBlocks.length > 0) {
                    html += `<div style="margin-bottom: 16px;">
                        <div style="font-weight: 600; color: #f59e0b; margin-bottom: 8px;">🟡 OTA Blocked (${syncedBlocks.length})</div>`;
                    
                    syncedBlocks.forEach(block => {
                        html += `
                            <div style="padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; margin-bottom: 8px;">
                                <div style="font-weight: 600; color: #1e293b;">${block.booking_summary || 'Blocked by OTA'}</div>
                                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
                                    Source: ${block.source || 'iCal Sync'}
                                </div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
                                    Synced: ${block.synced_at ? new Date(block.synced_at).toLocaleString() : 'Unknown'}
                                </div>
                            </div>
                        `;
                    });
                    html += `</div>`;
                }
                
                // No bookings
                if (dayBookings.length === 0 && syncedBlocks.length === 0) {
                    html += `<div style="padding: 24px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 32px; margin-bottom: 8px;">🟢</div>
                        <div style="font-weight: 600;">Available</div>
                        <div style="font-size: 13px; margin-top: 4px;">No bookings or blocks for this date</div>
                    </div>`;
                }
                
                todayBookingsEl.innerHTML = html;
                
            } catch (error) {
                console.error('Error showing day bookings:', error);
                todayBookingsEl.innerHTML = `<div style="color: #dc2626;">Error loading bookings for ${dateStr}</div>`;
            }
        }

        
        function changeMonth(direction) {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
            loadAvailabilityCalendar();
        }

        // Collapsible Sections

        function toggleCollapse(elementId, iconId) {
            const element = document.getElementById(elementId);
            const icon = document.getElementById(iconId);
            
            if (!element || !icon) return;
            
            const isCollapsed = element.style.display === 'none';
            
            if (isCollapsed) {
                element.style.display = 'block';
                icon.textContent = '🔽';
            } else {
                element.style.display = 'none';
                icon.textContent = '▶️';
            }
            
            // Save state
            saveCollapseState(elementId, !isCollapsed);
        }
        
        // Bulk Edit Functions
        function toggleRowSelection(checkbox, bookingId) {
            if (checkbox.checked) {
                selectedReservations.add(bookingId);
            } else {
                selectedReservations.delete(bookingId);
            }
            updateBulkActionsBar();
        }

        function toggleAllRows(checkbox) {
            const checkboxes = document.querySelectorAll('.row-select-checkbox');
            checkboxes.forEach(cb => {
                cb.checked = checkbox.checked;
                const bookingId = cb.getAttribute('data-booking-id');
                if (checkbox.checked) {
                    selectedReservations.add(bookingId);
                } else {
                    selectedReservations.delete(bookingId);
                }
            });
            updateBulkActionsBar();
        }

        function updateBulkActionsBar() {
            const count = selectedReservations.size;
            const bar = document.getElementById('bulkActionsBar');
            document.getElementById('bulkSelectedCount').textContent = count;
            
            if (count > 0) {
                bar.classList.add('show');
            } else {
                bar.classList.remove('show');
            }
        }

        function clearBulkSelection() {
            selectedReservations.clear();
            document.querySelectorAll('.row-select-checkbox').forEach(cb => cb.checked = false);
            document.getElementById('selectAllCheckbox').checked = false;
            updateBulkActionsBar();
        }

        function openBulkEditModal() {
            if (selectedReservations.size === 0) {
                showToast('No Selection', 'Please select at least one item', '⚠️');
                return;
            }
            
            document.getElementById('bulkEditCount').textContent = selectedReservations.size;
            document.getElementById('bulkEditField').value = '';
            document.getElementById('bulkEditValueGroup').style.display = 'none';
            document.getElementById('bulkEditModal').classList.add('active');
        }

        function closeBulkEditModal() {
            document.getElementById('bulkEditModal').classList.remove('active');
        }

        function updateBulkEditOptions() {
            const field = document.getElementById('bulkEditField').value;
            const valueGroup = document.getElementById('bulkEditValueGroup');
            const valueSelect = document.getElementById('bulkEditValue');
            const valueLabel = document.getElementById('bulkEditValueLabel');
            
            if (!field) {
                valueGroup.style.display = 'none';
                return;
            }
            
            valueGroup.style.display = 'block';
            
            if (field === 'status') {
                valueLabel.textContent = 'New Booking Status';
                valueSelect.innerHTML = `
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="checked-in">Checked In</option>
                    <option value="checked-out">Checked Out</option>
                    <option value="cancelled">Cancelled</option>
                `;
            } else if (field === 'payment_status') {
                valueLabel.textContent = 'New Payment Status';
                valueSelect.innerHTML = `
                    <option value="">Select Status</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                `;
            }
        }

        async function applyBulkEdit() {
            const field = document.getElementById('bulkEditField').value;
            const value = document.getElementById('bulkEditValue').value;
            
            if (!field || !value) {
                showToast('Validation Error', 'Please select both field and value', '❌');
                return;
            }
            
            if (selectedReservations.size === 0) {
                showToast('No Selection', 'No items selected', '⚠️');
                return;
            }
            
            const count = selectedReservations.size;
            if (!confirm(`Update ${field} to "${value}" for ${count} reservation(s)?`)) {
                return;
            }
            
            try {
                const bookingIds = Array.from(selectedReservations);
                
                if (navigator.onLine) {
                    await db.bulkUpdateReservations(bookingIds, { [field]: value });
                    closeBulkEditModal();
                    clearBulkSelection();
                    await loadReservations();
                    await loadDashboard();
                    showToast('Success', `Successfully updated ${count} reservation(s)!`, '✅');
                } else {
                    for (const bookingId of bookingIds) {
                        await saveToOfflineDB('pendingEdits', {
                            booking_id: bookingId,
                            table: 'reservations',
                            updates: { [field]: value }
                        });
                    }
                    closeBulkEditModal();
                    clearBulkSelection();
                    showToast('Saved Offline', `${count} edits will sync when online`, '💾');
                }
            } catch (error) {
                console.error('Bulk edit error:', error);
                showToast('Error', 'Failed to update reservations: ' + error.message, '❌');
            }
        }

        // Export Functions with Payment Recipient
        async function exportCSV() {
            // Use filtered data if filters are active, otherwise use all reservations
            const reservations = filteredReservationsForExport.length > 0 ? filteredReservationsForExport : allReservations;
            
            if (reservations.length === 0) {
                showToast('No Data', 'No reservations to export', '⚠️');
                return;
            }
            
            let csv = 'Booking ID,Property,Status,Booking Type,Booking Date,Check-in,Check-out,Nights,Guest,Phone,Email,City,Source,Rooms,Adults,Kids,Stay Amount,Extra Guest Charges,Meals/Chef Charges,Bonfire/Other Charges,Taxes,Damages,Total Amount,Hostizzy Revenue,GST Status,Payment Status,Paid Amount,Balance,Created Date\n';
            
            reservations.forEach(r => {
                const balance = (parseFloat(r.total_amount) || 0) - (parseFloat(r.paid_amount) || 0);
                
                // Format GST status
                const gstStatus = r.gst_status === 'gst' ? 'GST' : 'Non-GST';
                
                csv += [
                    r.booking_id || '',
                    r.property_name,
                    r.status,
                    r.booking_type || 'STAYCATION',
                    r.booking_date,
                    r.check_in,
                    r.check_out,
                    r.nights || 0,
                    r.guest_name,
                    r.guest_phone,
                    r.guest_email || '',
                    r.guest_city || '',
                    r.booking_source || '',
                    r.number_of_rooms || 0,
                    r.adults || 0,
                    r.kids || 0,
                    r.stay_amount || 0,
                    r.extra_guest_charges || 0,
                    r.meals_chef || 0,
                    r.bonfire_other || 0,
                    r.taxes || 0,
                    r.damages || 0,
                    r.total_amount || 0,
                    r.hostizzy_revenue || 0,
                    gstStatus,
                    r.payment_status || 'pending',
                    r.paid_amount || 0,
                    balance
                ].map(v => `"${v}"`).join(',') + '\n';
            });
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = filteredReservationsForExport.length > 0 ? 
                `hostizzy-reservations-filtered-${new Date().toISOString().split('T')[0]}.csv` :
                `hostizzy-reservations-${new Date().toISOString().split('T')[0]}.csv`;
            a.download = filename;
            a.click();
            showToast('Exported', `${reservations.length} reservations exported successfully`, '📥');
        }

        async function exportPaymentsCSV() {
            // Use filtered payments if filters are active
            const reservationsToExport = filteredPayments.length > 0 ? filteredPayments : allReservations;
            
            if (reservationsToExport.length === 0) {
                showToast('No Data', 'No payments to export', '⚠️');
                return;
            }
            
            let csv = 'Booking ID,Guest,Property,Check-in,Total Amount,OTA Fee,Net Amount,Paid Amount,Balance,Payment Status,Source\n';
            
            for (const r of reservationsToExport) {
                const total = parseFloat(r.total_amount) || 0;
                const otaFee = parseFloat(r.ota_service_fee) || 0;
                const netAmount = total - otaFee;
                const paid = parseFloat(r.paid_amount) || 0;
                const isOTA = r.booking_source && r.booking_source !== 'DIRECT';
                const balance = isOTA ? ((total - otaFee) - paid) : (total - paid);
                
                csv += [
                    r.booking_id || '',
                    r.guest_name || '',
                    r.property_name || '',
                    r.check_in || '',
                    total.toFixed(2),
                    otaFee.toFixed(2),
                    netAmount.toFixed(2),
                    paid.toFixed(2),
                    balance.toFixed(2),
                    r.payment_status || 'pending',
                    r.booking_source || 'DIRECT'
                ].map(v => `"${v}"`).join(',') + '\n';
            }
            
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const filename = filteredPayments.length > 0 ? 
                `hostizzy-payments-filtered-${new Date().toISOString().split('T')[0]}.csv` :
                `hostizzy-payments-${new Date().toISOString().split('T')[0]}.csv`;
            a.download = filename;
            a.click();
            showToast('Exported', `${reservationsToExport.length} payment records exported successfully`, '📥');
        }

        // Utilities
        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        // Check login on page load
        window.addEventListener('load', async () => {
            try {
                await initOfflineDB();
                console.log('Offline database ready');
            } catch (error) {
                console.error('Failed to initialize offline DB:', error);
            }
            
            isOnline = navigator.onLine;
            updateSyncIndicator();
            
            // Check localStorage for persistent session
            const storedUser = localStorage.getItem('currentUser');

            if (storedUser) {
                try {
                    currentUser = JSON.parse(storedUser);
                    
                    // User context set via RLS policies (custom auth)
                    
                    document.getElementById('loginScreen').classList.add('hidden');
                    document.getElementById('mainApp').classList.remove('hidden');
                    // Update email in both navbar and dropdown
                    updateUserEmailDisplay(currentUser.email);
                    document.querySelector('.mobile-nav').classList.remove('hidden');
                    document.getElementById('mobileHeader').classList.remove('hidden');
                    document.getElementById('mobileUserEmail').textContent = currentUser.email;
                    document.getElementById('sidebarUserEmail').textContent = currentUser.email;
                    
                    // Hide Performance for staff
                    if (currentUser.role === 'staff') {
                        hidePerformanceForStaff();
                    }
                    
                    // ✅ REMOVED: await loadDashboard();
                    // ✅ NEW: Load basic data in background without blocking
                    loadInitialData();
                    
                    initializeSplashScreen();
                    // Restore last view or default to home
                    const lastView = localStorage.getItem('lastView') || 'home';
                    setTimeout(() => showView(lastView), 1000);
                    
                    if (navigator.onLine) {
                        setTimeout(autoSync, 2000);
                        // Initialize auto-sync for properties with iCal URLs
                        setTimeout(initializeAutoSync, 3000);
                        // Initialize auto status update scheduler
                        setTimeout(scheduleAutoStatusUpdates, 3000);
                    }
                } catch (error) {
                    console.error('Session restore error:', error);
                    localStorage.removeItem('currentUser');
                    // Hide splash screen after 2 seconds even if session restore fails
                    setTimeout(() => {
                        const splash = document.getElementById('splashScreen');
                        if (splash) {
                            splash.style.opacity = '0';
                            setTimeout(() => {
                                splash.style.display = 'none';
                            }, 500);
                        }
                    }, 2000);
                }
            } else {
                // No stored session - show splash for 2 seconds then show login
                setTimeout(() => {
                    const splash = document.getElementById('splashScreen');
                    if (splash) {
                        splash.style.opacity = '0';
                        setTimeout(() => {
                            splash.style.display = 'none';
                        }, 500);
                    }
                }, 2000);
            }

        // ==========================================
        // SPLASH SCREEN & HOME SCREEN
        // ==========================================

        /**
         * Initialize splash screen and show home screen
         */
        function initializeSplashScreen() {
            // Show splash for 2.5 seconds (2 sec display + 0.5 sec fade)
            setTimeout(() => {
                const splash = document.getElementById('splashScreen');
                splash.style.opacity = '0';
                
                setTimeout(() => {
                    splash.style.display = 'none';
                    // Restore last view or default to home
                    const lastView = localStorage.getItem('lastView') || 'home';
                    showView(lastView);
                    // Update home stats if on home view
                    if (lastView === 'home') {
                        updateHomeScreenStats();
                    }
                }, 500);
            }, 2500);
        }

        // Push Notifications
        async function requestNotificationPermission() {
            if (!('Notification' in window)) {
                console.log('Notifications not supported');
                return false;
            }
            
            if (Notification.permission === 'granted') {
                return true;
            }
            
            if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            }
            
            return false;
        }

        function sendNotification(title, body, data = {}) {
            if (Notification.permission === 'granted') {
                const notification = new Notification(title, {
                    body: body,
                    icon: 'assets/logo.png',
                    badge: 'assets/logo.png',
                    tag: data.tag || 'resiq-notification',
                    requireInteraction: data.requireInteraction || false,
                    data: data
                });

                notification.onclick = () => {
                    window.focus();
                    if (data.action) {
                        eval(data.action);
                    }
                    notification.close();
                };
            }
        }

        // ============================================
        // PUSH NOTIFICATION SUBSCRIPTION (PWA)
        // ============================================

        // VAPID public key - Generate at: https://web-push-codelab.glitch.me/
        // IMPORTANT: Replace this with your actual VAPID public key
        // After generating keys, paste your PUBLIC key here (not the private key!)
        const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';

        // Instructions:
        // 1. Go to https://web-push-codelab.glitch.me/
        // 2. Click "Generate VAPID Keys"
        // 3. Copy the PUBLIC key (NOT the private key)
        // 4. Replace 'YOUR_VAPID_PUBLIC_KEY_HERE' above with your public key
        // 5. Add both keys to Supabase Vault (Settings → Vault → Secrets)
        // 6. Deploy and test!

        // Check if push notifications are supported
        function isPushSupported() {
            return 'serviceWorker' in navigator && 'PushManager' in window;
        }

        // Convert VAPID key to Uint8Array
        function urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }

        // Subscribe to push notifications
        async function subscribeToPush() {
            if (!isPushSupported()) {
                console.log('[Push] Push notifications not supported');
                return null;
            }

            try {
                const registration = await navigator.serviceWorker.ready;

                // Check existing subscription
                let subscription = await registration.pushManager.getSubscription();

                if (subscription) {
                    console.log('[Push] Already subscribed');
                    return subscription;
                }

                // Request notification permission first
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.log('[Push] Notification permission denied');
                    return null;
                }

                // Subscribe with VAPID key
                // Note: Replace VAPID_PUBLIC_KEY with actual key when setting up push service
                if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') {
                    console.log('[Push] VAPID key not configured - using local notifications only');
                    return null;
                }

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                });

                console.log('[Push] Successfully subscribed:', subscription.endpoint);

                // Store subscription (send to your server)
                await savePushSubscription(subscription);

                return subscription;
            } catch (error) {
                console.error('[Push] Subscription failed:', error);
                return null;
            }
        }

        // Unsubscribe from push notifications
        async function unsubscribeFromPush() {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();

                if (subscription) {
                    await subscription.unsubscribe();
                    console.log('[Push] Successfully unsubscribed');
                    // Remove from server
                    await removePushSubscription(subscription);
                }
            } catch (error) {
                console.error('[Push] Unsubscribe failed:', error);
            }
        }

        // Save subscription to Supabase
        async function savePushSubscription(subscription) {
            try {
                const subJSON = subscription.toJSON();
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');

                // Prepare subscription data
                const subscriptionData = {
                    user_id: userData?.id || null,
                    user_type: 'staff',  // Can be 'staff', 'owner', or 'guest'
                    user_email: userData?.email || '',
                    endpoint: subscription.endpoint,
                    expiration_time: subscription.expirationTime ? new Date(subscription.expirationTime).toISOString() : null,
                    p256dh_key: subJSON.keys.p256dh,
                    auth_key: subJSON.keys.auth,
                    user_agent: navigator.userAgent,
                    notification_types: ['kyc_submitted', 'payment_received', 'new_booking', 'checkin_today'],
                    enabled: true
                };

                // Upsert to database (update if endpoint exists, insert if new)
                const { data, error } = await supabase
                    .from('push_subscriptions')
                    .upsert(subscriptionData, {
                        onConflict: 'endpoint',
                        returning: 'representation'
                    });

                if (error) throw error;

                console.log('[Push] Subscription saved to database:', data);

                // Also save to localStorage as backup
                localStorage.setItem('pushSubscription', JSON.stringify(subJSON));

                showToast('✅ Push notifications enabled', 'You will receive important updates');
                return data;
            } catch (error) {
                console.error('[Push] Failed to save subscription:', error);
                showToast('⚠️ Push notifications error', 'Could not enable push notifications');
                throw error;
            }
        }

        // Remove subscription from Supabase
        async function removePushSubscription(subscription) {
            try {
                const { error } = await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);

                if (error) throw error;

                console.log('[Push] Subscription removed from database');
                localStorage.removeItem('pushSubscription');

                showToast('🔕 Push notifications disabled', 'You will no longer receive push notifications');
            } catch (error) {
                console.error('[Push] Failed to remove subscription:', error);
                localStorage.removeItem('pushSubscription');
            }
        }

        // Get current push subscription status
        async function getPushSubscriptionStatus() {
            if (!isPushSupported()) return { supported: false, subscribed: false };

            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                return {
                    supported: true,
                    subscribed: !!subscription,
                    subscription: subscription
                };
            } catch (error) {
                return { supported: true, subscribed: false, error: error.message };
            }
        }

        // Register background sync
        async function registerBackgroundSync(tag = 'resiq-sync-all') {
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    await registration.sync.register(tag);
                    console.log('[Sync] Background sync registered:', tag);
                } catch (error) {
                    console.error('[Sync] Background sync registration failed:', error);
                }
            }
        }

        // Listen for messages from service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                console.log('[SW Message]', event.data);

                if (event.data.type === 'SYNC_RESERVATIONS') {
                    syncAllPendingData();
                } else if (event.data.type === 'SYNC_PAYMENTS') {
                    syncAllPendingData();
                } else if (event.data.type === 'SYNC_ALL') {
                    syncAllPendingData();
                } else if (event.data.type === 'NOTIFICATION_CLICK') {
                    // Handle notification click navigation
                    if (event.data.url) {
                        window.location.href = event.data.url;
                    }
                }
            });
        }

        // ============================================
        // NOTIFICATION TRIGGERS (Phase 3)
        // ============================================

        // Helper function to call Edge Function for sending push
        async function sendPushNotification(notificationType, payload, options = {}) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.log('[Push] No session, skipping push notification');
                    return;
                }

                const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-push`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        notificationType,
                        payload,
                        ...options
                    })
                });

                const result = await response.json();
                console.log('[Push] Notification sent:', result);
                return result;
            } catch (error) {
                console.error('[Push] Failed to send notification:', error);
            }
        }

        // Trigger: KYC Document Submitted
        async function notifyKYCSubmitted(bookingId, guestName) {
            await sendPushNotification('kyc_submitted', {
                title: '📄 New KYC Document',
                body: `${guestName} submitted documents for booking #${bookingId}`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: `/?view=guest-documents&booking=${bookingId}`,
                requireInteraction: true
            }, {
                userTypes: ['staff'],  // Only notify staff
                bookingId: bookingId
            });
        }

        // Trigger: KYC Document Verified
        async function notifyKYCVerified(bookingId, guestName) {
            await sendPushNotification('kyc_verified', {
                title: '✅ Documents Verified',
                body: `Documents for ${guestName} (booking #${bookingId}) have been approved`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: `/?view=guest-documents&booking=${bookingId}`
            }, {
                bookingId: bookingId
            });
        }

        // Trigger: Payment Received
        async function notifyPaymentReceived(bookingId, amount, guestName) {
            await sendPushNotification('payment_received', {
                title: '💰 Payment Received',
                body: `${guestName} paid ₹${amount.toLocaleString('en-IN')} for booking #${bookingId}`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: `/?view=payments&booking=${bookingId}`
            }, {
                userTypes: ['staff', 'admin'],
                bookingId: bookingId
            });
        }

        // Trigger: New Booking Created
        async function notifyNewBooking(booking) {
            await sendPushNotification('new_booking', {
                title: '🏨 New Booking',
                body: `${booking.guest_name} booked ${booking.property_name} for ${booking.nights} nights`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: `/?view=reservations&booking=${booking.booking_id}`,
                requireInteraction: false
            }, {
                userTypes: ['staff', 'admin', 'manager'],
                bookingId: booking.booking_id
            });
        }

        // Trigger: Check-in Today Reminder
        async function notifyCheckinToday(reservations) {
            if (!reservations || reservations.length === 0) return;

            const guestList = reservations.map(r => r.guest_name).join(', ');
            const bookingIds = reservations.map(r => r.booking_id);

            await sendPushNotification('checkin_today', {
                title: '🔔 Check-ins Today',
                body: `${reservations.length} guest(s) checking in: ${guestList}`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: '/?view=reservations&filter=urgent',
                requireInteraction: false
            }, {
                userTypes: ['staff', 'admin', 'manager']
            });
        }

        // Trigger: Payment Overdue
        async function notifyPaymentOverdue(booking) {
            await sendPushNotification('payment_overdue', {
                title: '⚠️ Payment Overdue',
                body: `Booking #${booking.booking_id} has overdue payment of ₹${booking.balance.toLocaleString('en-IN')}`,
                icon: '/assets/logo-192.png',
                badge: '/assets/logo-96.png',
                url: `/?view=payments&booking=${booking.booking_id}`,
                requireInteraction: true
            }, {
                userTypes: ['admin', 'manager'],
                bookingId: booking.booking_id
            });
        }

        // Initialize push on page load (optional - can be triggered by user action)
        // Uncomment below to auto-prompt for push notifications
        // window.addEventListener('load', () => {
        //     setTimeout(() => subscribeToPush(), 5000);
        // });

        // Check for urgent notifications
        async function checkUrgentNotifications() {
            const hasPermission = await requestNotificationPermission();
            if (!hasPermission) return;
            
            const reservations = await db.getReservations();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Overdue payments
            const overdue = reservations.filter(r => {
                if (r.status === 'cancelled') return false;
                const checkIn = new Date(r.check_in);
                checkIn.setHours(0, 0, 0, 0);
                const balance = (parseFloat(r.total_amount) || 0) - (parseFloat(r.paid_amount) || 0);
                return balance > 0 && checkIn < today;
            });
            
            if (overdue.length > 0) {
                sendNotification(
                    '🔴 Overdue Payments',
                    `${overdue.length} booking(s) have overdue payments`,
                    { 
                        tag: 'overdue-payments',
                        requireInteraction: true,
                        action: "showView('payments')"
                    }
                );
            }
            
            // Today's check-ins
            const todayCheckIns = reservations.filter(r => {
                const checkIn = new Date(r.check_in);
                checkIn.setHours(0, 0, 0, 0);
                return checkIn.getTime() === today.getTime() && r.status !== 'cancelled';
            });
            
            if (todayCheckIns.length > 0) {
                sendNotification(
                    '🏨 Check-ins Today',
                    `${todayCheckIns.length} guest(s) checking in today`,
                    { 
                        tag: 'today-checkins',
                        action: "applyQuickFilter('urgent')"
                    }
                );
            }
        }    
        });

        // ============================================
        // GUEST DOCUMENTS JAVASCRIPT FUNCTIONS
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
        
                if (error) {
                    console.error('Error loading guest documents:', error);
                    // Don't throw - show empty state if no table exists yet
                    currentGuestDocuments = [];
                } else {
                    currentGuestDocuments = documents || [];
                }
        
                renderGuestDocuments();
                updateDocumentStats();
                updateHomeStatDocuments();
        
                hideLoading();
            } catch (error) {
                hideLoading();
                console.error('Error loading guest documents:', error);
                // Show user-friendly message
                const container = document.getElementById('guestDocumentsList');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                            <div style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Unable to load documents</div>
                            <div style="font-size: 14px;">Please ensure the database schema has been set up.</div>
                            <div style="font-size: 14px; margin-top: 8px;">
                                <a href="#" onclick="loadGuestDocuments(); return false;" style="color: var(--primary);">Retry</a>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        // ============================================
        // RENDER GUEST DOCUMENTS LIST
        // ============================================
        function renderGuestDocuments() {
            const container = document.getElementById('guestDocumentsList');
            if (!container) return;
        
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
                        (doc.booking_id || '').toLowerCase().includes(searchTerm) ||
                        (doc.guest_name || '').toLowerCase().includes(searchTerm) ||
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
                                    📅 ${reservation ? formatDateHelper(reservation.check_in) : '-'} - ${reservation ? formatDateHelper(reservation.check_out) : '-'}
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
                        Submitted: ${formatDateTimeHelper(doc.submitted_at)}
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
        
            const pendingEl = document.getElementById('docStatPending');
            const verifiedEl = document.getElementById('docStatVerified');
            const rejectedEl = document.getElementById('docStatRejected');
            const incompleteEl = document.getElementById('docStatIncomplete');
        
            if (pendingEl) pendingEl.textContent = pending;
            if (verifiedEl) verifiedEl.textContent = verified;
            if (rejectedEl) rejectedEl.textContent = rejected;
            if (incompleteEl) incompleteEl.textContent = incomplete;
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
            showToast('Documents refreshed successfully!', 'success');
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
                document.getElementById('modalSubmittedAt').textContent = formatDateTimeHelper(doc.submitted_at);
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
                    document.getElementById('verifiedAt').textContent = formatDateTimeHelper(doc.verified_at);
                } else {
                    document.getElementById('modalActions').style.display = 'flex';
                    document.getElementById('rejectFormSection').style.display = 'none';
                    document.getElementById('verifiedMessage').style.display = 'none';
                }
                
                // Show delete button only for admins
                const deleteContainer = document.getElementById('deleteButtonContainer');
                if (currentUser && currentUser.role === 'admin') {
                    deleteContainer.style.display = 'block';
                } else {
                    deleteContainer.style.display = 'none';
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
                        staff_notes: notes,
                        rejection_reason: null,
                        resubmission_deadline: null
                    })
                    .eq('id', currentDocumentForReview.id);
        
                if (error) throw error;

                hideLoading();
                showToast('Document approved successfully!', 'success');

                // Send push notification
                notifyKYCVerified(
                    currentDocumentForReview.booking_id,
                    currentDocumentForReview.guest_name
                );

                closeGuestDocumentModal();
                await loadGuestDocuments();
        
            } catch (error) {
                hideLoading();
                console.error('Error approving document:', error);
                showToast('Failed to approve document', 'error');
            }
        }

        // ============================================
        // DELETE DOCUMENT (ADMIN ONLY)
        // ============================================
        async function deleteDocument() {
            if (!currentDocumentForReview) return;
            
            // Confirm deletion
            if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
                return;
            }
        
            try {
                showLoading('Deleting document...');
        
                // Delete from database
                const { error } = await supabase
                    .from('guest_documents')
                    .delete()
                    .eq('id', currentDocumentForReview.id);
        
                if (error) throw error;
        
                hideLoading();
                showToast('Document deleted successfully', 'success');
                closeGuestDocumentModal();
                await loadGuestDocuments();
        
            } catch (error) {
                hideLoading();
                console.error('Error deleting document:', error);
                showToast('Failed to delete document', 'error');
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
        
                hideLoading();
                showToast('Document rejected', 'success');
                
                // Send WhatsApp notification to guest about resubmission
                if (currentDocumentForReview.reservations) {
                    const reservation = currentDocumentForReview.reservations[0];
                    const checkInDate = new Date(reservation.check_in);
                    const deadline = new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before
                    const deadlineStr = deadline.toLocaleDateString('en-IN');
                    
                    const message = `Hi ${reservation.guest_name}, your ID document was not approved. Please resubmit before ${deadlineStr}. Reason: ${reason}`;
                    const formattedPhone = reservation.guest_phone.replace(/\D/g, '');
                    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
                    
                    // Open WhatsApp (user can send manually or auto-send if integrated)
                    console.log('WhatsApp message ready:', message);
                    // Uncomment line below if you want to auto-open WhatsApp
                    // window.open(whatsappUrl, '_blank');
                }
                
                closeGuestDocumentModal();
                await loadGuestDocuments();
        
            } catch (error) {
                hideLoading();
                console.error('Error rejecting document:', error);
                showToast('Failed to reject document', 'error');
            }
        }
        
        // ============================================
        // REVERSE APPROVAL TO REJECT
        // ============================================
        async function reverseApprovalToReject() {
            if (!currentDocumentForReview) return;
            
            // Confirm the action
            if (!confirm('Are you sure you want to revert this approval? The document will be marked as rejected.')) {
                return;
            }
        
            try {
                showLoading('Reverting approval...');
        
                const { error } = await supabase
                    .from('guest_documents')
                    .update({
                        status: 'rejected',
                        verified_by: null,
                        verified_at: null,
                        rejection_reason: 'Reverted from approved (manual correction)',
                        staff_notes: 'Auto-reverted by admin'
                    })
                    .eq('id', currentDocumentForReview.id);
        
                if (error) throw error;
        
                hideLoading();
                showToast('Approval reverted - Document marked as rejected', 'success');
                closeGuestDocumentModal();
                await loadGuestDocuments();
        
            } catch (error) {
                hideLoading();
                console.error('Error reverting approval:', error);
                showToast('Failed to revert approval', 'error');
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
            const portalUrl = window.location.origin + '/guest-portal.html';
        
            navigator.clipboard.writeText(portalUrl).then(() => {
                showToast('Guest portal link copied to clipboard!', 'success');
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
        // HELPER FUNCTIONS
        // ============================================
        function formatDateHelper(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }
        
        function formatDateTimeHelper(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        
        console.log('✅ Guest Documents functions loaded successfully');
    </script>

    <script>

   // PWA Install Prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('💡 PWA install prompt ready');
        console.log('Event:', e);
        
        // Prevent the mini-infobar from appearing
        e.preventDefault();
        deferredPrompt = e;
        
    });
    
    // Log PWA installation criteria
    console.log('PWA Check:', {
        isHTTPS: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
        hasServiceWorker: 'serviceWorker' in navigator,
        hasManifest: document.querySelector('link[rel="manifest"]') !== null
    });

    // Handle install button click
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                console.log('No deferred prompt available');
                return;
            }
            
            // Show the install prompt
            deferredPrompt.prompt();
            
            // Wait for the user's response
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA install: ${outcome}`);
            
            // Clear the deferred prompt
            deferredPrompt = null;
            
            // Hide the install bar
            const installBar = document.getElementById('installBar');
            if (installBar) {
                installBar.style.display = 'none';
            }
            
            if (outcome === 'accepted') {
                showToast('Success', 'App installed successfully!', '🎉');
            }
        });
    }

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
        console.log('🎉 PWA installed successfully');
        deferredPrompt = null;
        
        // Hide install bar
        const installBar = document.getElementById('installBar');
        if (installBar) {
            installBar.style.display = 'none';
        }
        
        showToast('Success', 'ResIQ installed! Open from your home screen.', '🎉');
    });

    // Quick Actions System
    let selectedActionIndex = 0;
    let filteredActions = [];

    const quickActions = [
        {
            id: 'new-booking',
            icon: '📅',
            title: 'New Reservation',
            desc: 'Add a new booking',
            keywords: ['new', 'booking', 'reservation', 'add'],
            action: () => {
                closeQuickActions();
                openReservationModal();
            }
        },
        {
            id: 'new-payment',
            icon: '💰',
            title: 'Add Payment',
            desc: 'Record a new payment',
            keywords: ['payment', 'pay', 'money', 'collect'],
            action: () => {
                closeQuickActions();
                const lastBooking = allReservations[0];
                if (lastBooking) {
                    openPaymentModal(lastBooking.booking_id);
                } else {
                    showToast('No Bookings', 'Create a reservation first', '⚠️');
                }
            }
        },
        {
            id: 'search',
            icon: '🔍',
            title: 'Search Reservations',
            desc: 'Find a booking by ID or guest name',
            keywords: ['search', 'find', 'lookup'],
            action: () => {
                closeQuickActions();
                showView('reservations');
                document.getElementById('searchReservations').focus();
            }
        },
        {
            id: 'checkins-today',
            icon: '🏨',
            title: 'Check-ins Today',
            desc: 'View all arrivals for today',
            keywords: ['checkin', 'arrival', 'today'],
            action: () => {
                closeQuickActions();
                showView('reservations');
                const today = new Date().toISOString().split('T')[0];
                const todayCheckIns = allReservations.filter(r => r.check_in === today);
                displayReservations(todayCheckIns);
                showToast('Today\'s Check-ins', `${todayCheckIns.length} arrivals`, 'ℹ️');
            }
        },
        {
            id: 'checkouts-today',
            icon: '🚪',
            title: 'Check-outs Today',
            desc: 'View all departures for today',
            keywords: ['checkout', 'departure', 'today'],
            action: () => {
                closeQuickActions();
                showView('reservations');
                const today = new Date().toISOString().split('T')[0];
                const todayCheckOuts = allReservations.filter(r => r.check_out === today);
                displayReservations(todayCheckOuts);
                showToast('Today\'s Check-outs', `${todayCheckOuts.length} departures`, 'ℹ️');
            }
        },
        {
            id: 'pending-payments',
            icon: '⚠️',
            title: 'Pending Payments',
            desc: 'Show all unpaid bookings',
            keywords: ['pending', 'unpaid', 'due', 'payment'],
            action: () => {
                closeQuickActions();
                showView('payments');
                document.getElementById('paymentStatusFilter').value = 'pending';
                filterPayments();
            }
        },
        {
            id: 'dashboard',
            icon: '📊',
            title: 'Dashboard',
            desc: 'View analytics and overview',
            keywords: ['dashboard', 'home', 'overview', 'stats'],
            action: () => {
                closeQuickActions();
                showView('dashboard');
            }
        },
        {
            id: 'export-csv',
            icon: '📥',
            title: 'Export Reservations',
            desc: 'Download CSV file',
            keywords: ['export', 'download', 'csv', 'backup'],
            action: () => {
                closeQuickActions();
                exportCSV();
            }
        },
        {
            id: 'export-payments',
            icon: '💳',
            title: 'Export Payments',
            desc: 'Download payment records',
            keywords: ['export', 'payment', 'download'],
            action: () => {
                closeQuickActions();
                exportPaymentsCSV();
            }
        },
        {
            id: 'add-property',
            icon: '🏠',
            title: 'Add Property',
            desc: 'Register a new property',
            keywords: ['property', 'add', 'new', 'villa'],
            action: () => {
                closeQuickActions();
                showView('properties');
                openPropertyModal();
            }
        },
        {
            id: 'sync-data',
            icon: '🔄',
            title: 'Sync Offline Data',
            desc: 'Upload pending changes',
            keywords: ['sync', 'upload', 'offline'],
            action: () => {
                closeQuickActions();
                manualSync();
            }
        },
        {
            id: 'calendar',
            icon: '🗓️',
            title: 'Availability Calendar',
            desc: 'View property calendar',
            keywords: ['calendar', 'availability', 'schedule'],
            action: () => {
                closeQuickActions();
                showView('availability');
            }
        }
    ];

    function openQuickActions() {
        const overlay = document.getElementById('quickActionsOverlay');
        overlay.classList.add('active');
        
        // Reset and render
        selectedActionIndex = 0;
        filteredActions = [...quickActions];
        renderQuickActions();
        
        // Focus search input
        setTimeout(() => {
            document.getElementById('quickActionsSearch').focus();
        }, 100);
    }

    function closeQuickActions(event) {
        if (event && event.target !== document.getElementById('quickActionsOverlay')) return;
        
        const overlay = document.getElementById('quickActionsOverlay');
        overlay.classList.remove('active');
        document.getElementById('quickActionsSearch').value = '';
    }

    function renderQuickActions() {
        const list = document.getElementById('quickActionsList');
        
        if (filteredActions.length === 0) {
            list.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No actions found</div>';
            return;
        }
        
        list.innerHTML = filteredActions.map((action, index) => `
            <div class="quick-action-item ${index === selectedActionIndex ? 'selected' : ''}" onclick="executeQuickAction(${index})" data-index="${index}">
                <div class="quick-action-icon">${action.icon}</div>
                <div class="quick-action-content">
                    <div class="quick-action-title">${action.title}</div>
                    <div class="quick-action-desc">${action.desc}</div>
                </div>
            </div>
        `).join('');
    }

    function filterQuickActions(event) {
        const query = event.target.value.toLowerCase().trim();
        
        // Handle keyboard navigation
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedActionIndex = Math.min(selectedActionIndex + 1, filteredActions.length - 1);
            renderQuickActions();
            scrollToSelected();
            return;
        }
        
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedActionIndex = Math.max(selectedActionIndex - 1, 0);
            renderQuickActions();
            scrollToSelected();
            return;
        }
        
        if (event.key === 'Enter') {
            event.preventDefault();
            executeQuickAction(selectedActionIndex);
            return;
        }
        
        if (event.key === 'Escape') {
            closeQuickActions();
            return;
        }
        
        // Filter actions
        if (query === '') {
            filteredActions = [...quickActions];
        } else {
            filteredActions = quickActions.filter(action => {
                const searchText = `${action.title} ${action.desc} ${action.keywords.join(' ')}`.toLowerCase();
                return searchText.includes(query);
            });
        }
        
        selectedActionIndex = 0;
        renderQuickActions();
    }

    function executeQuickAction(index) {
        if (filteredActions[index]) {
            filteredActions[index].action();
        }
    }

    function scrollToSelected() {
        const list = document.getElementById('quickActionsList');
        const selected = list.querySelector('.quick-action-item.selected');
        if (selected) {
            selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    // Keyboard shortcut: Ctrl+K or Cmd+K
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const overlay = document.getElementById('quickActionsOverlay');
            if (overlay.classList.contains('active')) {
                closeQuickActions();
            } else {
                openQuickActions();
            }
        }
    });

    // Close modals on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close any open modal
            document.querySelectorAll('.modal.active, .modal.show').forEach(modal => {
                modal.classList.remove('active', 'show');
            });
        }
    });

    // Enhanced keyboard shortcuts for navigation
    document.addEventListener('keydown', (e) => {
        // Only trigger if not typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }
        
        // Alt + Number shortcuts for quick navigation
        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            e.preventDefault();
            switch(e.key) {
                case '1':
                    showView('home');
                    showToast('Navigation', 'Home View', '🏠');
                    break;
                case '2':
                    showView('dashboard');
                    showToast('Navigation', 'Dashboard View', '📊');
                    break;
                case '3':
                    showView('reservations');
                    showToast('Navigation', 'Reservations View', '📋');
                    break;
                case '4':
                    showView('payments');
                    showToast('Navigation', 'Payments View', '💰');
                    break;
                case '5':
                    showView('availability');
                    showToast('Navigation', 'Availability View', '📅');
                    break;
                case '6':
                    showView('properties');
                    showToast('Navigation', 'Properties View', '🏡');
                    break;
                case '7':
                    showView('performance');
                    showToast('Navigation', 'Performance View', '📈');
                    break;
                case '8':
                    showView('team');
                    showToast('Navigation', 'Team View', '👥');
                    break;
            }
        }
        
        // Ctrl/Cmd + S to save (when in forms)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            const activeModal = document.querySelector('.modal.active, .modal.show');
            if (activeModal) {
                e.preventDefault();
                // Find and click the save/submit button in the modal
                const saveButton = activeModal.querySelector('button[type="submit"], button.btn-primary');
                if (saveButton) {
                    saveButton.click();
                    showToast('Saved', 'Form submitted', '✅');
                }
            }
        }
        
        // ? key to show keyboard shortcuts
        if (e.key === '?' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            showKeyboardShortcuts();
        }
    });

    // Keyboard shortcuts modal functions
    function showKeyboardShortcuts() {
        document.getElementById('keyboardShortcutsModal').classList.add('show');
    }

    function closeKeyboardShortcuts() {
        document.getElementById('keyboardShortcutsModal').classList.remove('show');
    }

    // ============================================
    // PULL TO REFRESH
    // ============================================

    let touchStartY = 0;
    let touchEndY = 0;
    let isPulling = false;
    let isRefreshing = false;
    const pullThreshold = 80; // pixels to pull before refresh

    const pullIndicator = document.getElementById('pullToRefreshIndicator');
    const pullArrow = document.getElementById('pullToRefreshArrow');

    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0 && !isRefreshing) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;
        
        touchEndY = e.touches[0].clientY;
        const pullDistance = touchEndY - touchStartY;
        
        if (pullDistance > 0 && window.scrollY === 0) {
            // Prevent default scrolling while pulling
            if (pullDistance > 10) {
                e.preventDefault();
            }
            
            // Show indicator with better positioning
            const progress = Math.min(pullDistance / pullThreshold, 1.2);
            const topPosition = -80 + (170 * progress); // Increased range
            
            pullIndicator.style.top = `${topPosition}px`;
            pullIndicator.style.opacity = Math.min(progress, 1);
            pullIndicator.style.transform = `translateX(-50%) scale(${0.8 + (progress * 0.2)})`;
            
            // Flip arrow when threshold reached
            if (pullDistance >= pullThreshold) {
                pullArrow.classList.add('flip');
                pullArrow.textContent = '🔄';
                pullIndicator.style.borderColor = 'var(--success)';
            } else {
                pullArrow.classList.remove('flip');
                pullArrow.textContent = '⬇️';
                pullIndicator.style.borderColor = 'var(--primary)';
            }
        }
    }, { passive: false }); // Changed to false to allow preventDefault

    document.addEventListener('touchend', async (e) => {
        if (!isPulling || isRefreshing) return;
        
        const pullDistance = touchEndY - touchStartY;
        
        if (pullDistance >= pullThreshold && window.scrollY === 0) {
            // Trigger refresh
            isRefreshing = true;
            pullIndicator.classList.add('active', 'loading');
            pullIndicator.style.borderColor = 'var(--success)';
            pullArrow.textContent = '⏳';
            
            // Haptic feedback
            if ('vibrate' in navigator) {
                navigator.vibrate([10, 50, 10]);
            }
            
            // Refresh current view
            await refreshCurrentView();
            
            // Show success state
            pullArrow.textContent = '✅';
            
            // Hide indicator after delay
            setTimeout(() => {
                pullIndicator.classList.remove('active', 'loading');
                pullIndicator.style.top = '-80px';
                pullIndicator.style.opacity = '0';
                pullIndicator.style.transform = 'translateX(-50%) scale(1)';
                pullIndicator.style.borderColor = 'var(--primary)';
                pullArrow.textContent = '⬇️';
                pullArrow.classList.remove('flip');
                isRefreshing = false;
                isPulling = false;
            }, 1500); // Increased from 1000ms
        } else {
            // Reset indicator smoothly
            pullIndicator.style.top = '-80px';
            pullIndicator.style.opacity = '0';
            pullIndicator.style.transform = 'translateX(-50%) scale(1)';
            pullIndicator.style.borderColor = 'var(--primary)';
            pullArrow.classList.remove('flip');
            pullArrow.textContent = '⬇️';
            isPulling = false;
        }
        
        touchStartY = 0;
        touchEndY = 0;
    });


    async function refreshCurrentView() {
        // Determine which view is active
        const views = ['home', 'dashboard', 'reservations', 'payments', 'availability', 'properties', 'performance'];
        
        for (const view of views) {
            const viewElement = document.getElementById(`${view}View`);
            if (viewElement && !viewElement.classList.contains('hidden')) {
                // Refresh the active view
                switch(view) {
                    case 'home':
                        await loadInitialData();
                        await updateHomeScreenStats();
                        break;
                    case 'dashboard':
                        await loadDashboard();
                        break;
                    case 'reservations':
                        await loadReservations();
                        break;
                    case 'payments':
                        await loadPayments();
                        break;
                    case 'availability':
                        await loadAvailabilityCalendar();
                        break;
                    case 'properties':
                        loadProperties();
                        break;
                    case 'guests':
                        loadGuests();
                        break;
                    case 'performance':
                        await initializePerformanceView();
                        break;
                }
                showToast('Refreshed', 'Data updated successfully', '✅');
                break;
            }
        }
    } 
    
    // ============================================
    // HAPTIC FEEDBACK
    // ============================================

    function haptic(pattern = 'light') {
        if (!('vibrate' in navigator)) return;
        
        const patterns = {
            light: [10],
            medium: [20],
            heavy: [30],
            success: [10, 50, 10],
            error: [20, 100, 20],
            warning: [15, 75, 15],
            double: [10, 50, 10],
            triple: [10, 30, 10, 30, 10]
        };
        
        navigator.vibrate(patterns[pattern] || patterns.light);
    }

    // Apply haptic to all buttons
    document.addEventListener('click', (e) => {
        const button = e.target.closest('button, .btn, a[onclick]');
        if (button && !button.disabled) {
            haptic('light');
        }
    });

    // Apply haptic to form submissions
    document.addEventListener('submit', (e) => {
        haptic('medium');
    });

    // Apply haptic to checkbox/radio changes
    document.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox' || e.target.type === 'radio') {
            haptic('light');
        }
    });

    // ============================================
    // VOICE COMMANDS FOR QUICK ACTIONS
    // ============================================
    
    let voiceCommandRecognition = null;

    function initVoiceCommand() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            return null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';
        recognition.maxAlternatives = 3;

        return recognition;
    }

    function startVoiceCommand() {
        if (!voiceCommandRecognition) {
            voiceCommandRecognition = initVoiceCommand();
        }
        
        if (!voiceCommandRecognition) {
            showToast('Voice Error', 'Speech recognition not supported', '❌');
            return;
        }

        const btn = document.getElementById('voiceCommandBtn');
        const searchInput = document.getElementById('quickActionsSearch');
        
        btn.classList.add('listening');
        searchInput.value = '';
        searchInput.placeholder = 'Listening...';

        let finalTranscript = '';

        voiceCommandRecognition.onresult = (event) => {
            let interimTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript = transcript;
                } else {
                    interimTranscript = transcript;
                }
            }

            // Show what's being heard
            const displayText = interimTranscript || finalTranscript;
            if (displayText) {
                searchInput.value = displayText;
            }
        };

        voiceCommandRecognition.onend = () => {
            btn.classList.remove('listening');
            searchInput.placeholder = 'Type a command or search...';

            if (finalTranscript.trim()) {
                processVoiceCommand(finalTranscript.trim());
            }
        };

        voiceCommandRecognition.onerror = (event) => {
            console.error('Voice error:', event.error);
            btn.classList.remove('listening');
            searchInput.placeholder = 'Type a command or search...';
            
            if (event.error !== 'no-speech') {
                showToast('Voice Error', 'Could not recognize speech', '❌');
            }
        };

        voiceCommandRecognition.start();

        // Auto-stop after 5 seconds
        setTimeout(() => {
            if (btn.classList.contains('listening')) {
                voiceCommandRecognition.stop();
            }
        }, 5000);
    }

    function processVoiceCommand(command) {
        const cmd = command.toLowerCase();
        
        console.log('Voice command:', command);

        // Match command to actions
        let matchedAction = null;

        // Direct navigation commands
        if (cmd.includes('dashboard') || cmd.includes('home')) {
            matchedAction = quickActions.find(a => a.id === 'dashboard');
        }
        else if (cmd.includes('payment') && cmd.includes('pending')) {
            matchedAction = quickActions.find(a => a.id === 'pending-payments');
        }
        else if (cmd.includes('check') && cmd.includes('in') && (cmd.includes('today') || cmd.includes('todays'))) {
            matchedAction = quickActions.find(a => a.id === 'checkins-today');
        }
        else if (cmd.includes('check') && cmd.includes('out') && (cmd.includes('today') || cmd.includes('todays'))) {
            matchedAction = quickActions.find(a => a.id === 'checkouts-today');
        }
        else if (cmd.includes('calendar') || cmd.includes('availability')) {
            matchedAction = quickActions.find(a => a.id === 'calendar');
        }
        else if (cmd.includes('export') && cmd.includes('payment')) {
            matchedAction = quickActions.find(a => a.id === 'export-payments');
        }
        else if (cmd.includes('export')) {
            matchedAction = quickActions.find(a => a.id === 'export-csv');
        }
        else if (cmd.includes('add') && cmd.includes('property')) {
            matchedAction = quickActions.find(a => a.id === 'add-property');
        }
        else if (cmd.includes('sync')) {
            matchedAction = quickActions.find(a => a.id === 'sync-data');
        }
        // Search commands
        else if (cmd.includes('show') || cmd.includes('find') || cmd.includes('search')) {
            // Extract search term (everything after "show"/"find"/"search")
            let searchTerm = cmd;
            searchTerm = searchTerm.replace(/^(show|find|search)\s+/i, '');
            searchTerm = searchTerm.replace(/\s+(reservation|booking|property|guest)s?$/i, '');
            
            if (searchTerm) {
                closeQuickActions();
                showView('reservations');
                document.getElementById('searchReservations').value = searchTerm;
                searchReservations();
                showToast('Search', `Showing results for "${searchTerm}"`, '🔍');
                return;
            }
        }

        // Execute matched action
        if (matchedAction) {
            showToast('Voice Command', `Executing: ${matchedAction.title}`, '✅');
            setTimeout(() => {
                matchedAction.action();
            }, 500);
        } else {
            // Fallback: Use as search query
            document.getElementById('quickActionsSearch').value = command;
            filterQuickActions({ target: document.getElementById('quickActionsSearch') });
            showToast('Search', `Searching for: "${command}"`, '🔍');
        }
    }
    // ============================================
    // CSV IMPORT FUNCTIONS
    // ============================================
    
    let csvData = [];
    let validRows = [];
    let skippedRows = [];

    function openImportModal() {
        document.getElementById('importModal').classList.add('active');
        resetImport();
    }

    function closeImportModal() {
        document.getElementById('importModal').classList.remove('active');
        resetImport();
    }

    function resetImport() {
        // Reset to step 1
        document.getElementById('importStep1').style.display = 'block';
        document.getElementById('importStep2').style.display = 'none';
        document.getElementById('importStep3').style.display = 'none';
        document.getElementById('importStep4').style.display = 'none';
        
        // Clear data
        csvData = [];
        validRows = [];
        skippedRows = [];
        
        // Reset file input
        document.getElementById('csvFileInput').value = '';
    }

    function handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        
        reader.onload = function(e) {
            const text = e.target.result;
            parseCSV(text);
        };
        
        reader.onerror = function() {
            showToast('Error', 'Failed to read CSV file', '❌');
        };
        
        reader.readAsText(file);
    }

    function parseCSV(text) {
        try {
            // Simple CSV parser (handles quoted fields)
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            csvData = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = parseCSVLine(lines[i]);
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
                });
                
                csvData.push(row);
            }
            
            validateAndPreview();
            
        } catch (error) {
            console.error('CSV Parse Error:', error);
            showToast('Parse Error', 'Invalid CSV format. Please check your file.', '❌');
        }
    }

    function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }

    function validateAndPreview() {
        const excludeFY2526 = document.getElementById('excludeFY2526').checked;
        const skipDuplicates = document.getElementById('skipDuplicates').checked;
        
        validRows = [];
        skippedRows = [];
        
        // Get existing booking IDs for duplicate check
        const existingBookingIds = new Set(allReservations.map(r => r.booking_id));
        
        csvData.forEach((row, index) => {
            const rowNum = index + 2; // +2 because index starts at 0 and row 1 is header
            let skipReason = null;
            
            // Check FY filter
            if (excludeFY2526 && row.FY === 'FY 2025-26') {
                skipReason = 'FY 2025-26 excluded';
            }
            
            // Check duplicates
            if (skipDuplicates && existingBookingIds.has(row.booking_id)) {
                skipReason = 'Duplicate booking ID';
            }
            
            // Check required fields
            if (!row.property_name || !row.booking_id || !row.guest_name) {
                skipReason = 'Missing required fields';
            }
            
            if (skipReason) {
                skippedRows.push({ row, reason: skipReason, rowNum });
            } else {
                validRows.push(row);
            }
        });
        
        // Update stats
        document.getElementById('totalRows').textContent = csvData.length;
        document.getElementById('validRows').textContent = validRows.length;
        document.getElementById('skippedRows').textContent = skippedRows.length;
        document.getElementById('importCount').textContent = validRows.length;
        
        // Render preview
        renderPreview();
        
        // Show step 2
        document.getElementById('importStep1').style.display = 'none';
        document.getElementById('importStep2').style.display = 'block';
    }

    function renderPreview() {
        const tbody = document.getElementById('previewTableBody');
        const previewLimit = 50; // Show first 50 rows
        
        let html = '';
        
        validRows.slice(0, previewLimit).forEach(row => {
            html += `
                <tr style="background: #f0fdf4;">
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${row.property_name || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${row.guest_name || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${row.check_in || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;"><span style="color: var(--success); font-size: 11px;">✓ Valid</span></td>
                </tr>
            `;
        });
        
        skippedRows.slice(0, 10).forEach(item => {
            html += `
                <tr style="background: #fef2f2;">
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${item.row.property_name || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${item.row.guest_name || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;">${item.row.check_in || '-'}</td>
                    <td style="padding: 8px; border-bottom: 1px solid var(--border); text-align: left;"><span style="color: var(--danger); font-size: 11px;">✗ ${item.reason}</span></td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    async function startImport() {
        if (validRows.length === 0) {
            showToast('No Data', 'No valid rows to import', '⚠️');
            return;
        }
        
        // Show step 3 (progress)
        document.getElementById('importStep2').style.display = 'none';
        document.getElementById('importStep3').style.display = 'block';
        document.getElementById('importTotal').textContent = validRows.length;
        
        let imported = 0;
        let errors = [];
        
        // Import in batches of 50
        const batchSize = 50;
        
        for (let i = 0; i < validRows.length; i += batchSize) {
            const batch = validRows.slice(i, i + batchSize);
            
            try {
                const { data, error } = await supabase
                    .from('reservations')
                    .insert(batch)
                    .select();
                
                if (error) throw error;
                
                imported += batch.length;
                
            } catch (error) {
                console.error('Import batch error:', error);
                errors.push(`Rows ${i + 1}-${i + batch.length}: ${error.message}`);
            }
            
            // Update progress
            document.getElementById('importProgress').textContent = Math.min(imported, validRows.length);
            const progress = (Math.min(imported, validRows.length) / validRows.length) * 100;
            document.getElementById('importProgressBar').style.width = progress + '%';
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Show step 4 (complete)
        document.getElementById('importStep3').style.display = 'none';
        document.getElementById('importStep4').style.display = 'block';
        document.getElementById('importedCount').textContent = imported;
        
        // Show errors if any
        if (errors.length > 0) {
            document.getElementById('importErrors').style.display = 'block';
            document.getElementById('errorList').innerHTML = errors.map(e => `<li>${e}</li>`).join('');
        }
        
        // Reload reservations
        await loadReservations();
        
        showToast('Import Complete', `Successfully imported ${imported} reservations!`, '✅');
    }
        function toggleFormatGuide() {
        const guide = document.getElementById('formatGuide');
        const icon = document.getElementById('formatGuideIcon');
        
        if (guide.style.display === 'none') {
            guide.style.display = 'block';
            icon.textContent = '▲';
        } else {
            guide.style.display = 'none';
            icon.textContent = '▼';
        }
    }
        // ==========================================
        // GUEST MANAGEMENT FUNCTIONS
        // ==========================================

        let allGuests = [];
        let filteredGuests = [];
        let displayedGuests = [];
        let currentGuestData = null;
        let currentGuestView = 'table'; // 'table' or 'cards'
        let currentGuestPage = 1;
        let guestsPerPage = 50;
        let currentSortColumn = 'name';
        let currentSortDirection = 'asc';

        /**
         * Load and display all guests
         */
        async function loadGuests() {
            try {
                console.log('Loading guests...');
                
                // Get all reservations
                const reservations = await db.getReservations();
                console.log('Reservations loaded:', reservations.length);
                
                // Create guest map (group by phone or email)
                const guestMap = new Map();
                
                reservations.forEach(r => {
                    // Use phone as primary identifier, fallback to email
                    const guestKey = (r.guest_phone || r.guest_email || r.guest_name || '').toLowerCase().trim();
                    
                    if (!guestKey) return;
                    
                    if (!guestMap.has(guestKey)) {
                        guestMap.set(guestKey, {
                            name: r.guest_name,
                            phone: r.guest_phone || '',
                            email: r.guest_email || '',
                            bookings: [],
                            key: guestKey
                        });
                    }
                    
                    guestMap.get(guestKey).bookings.push(r);
                    
                    // Update name/phone/email to latest non-empty values
                    const guest = guestMap.get(guestKey);
                    if (r.guest_name && r.guest_name !== guest.name) guest.name = r.guest_name;
                    if (r.guest_phone && r.guest_phone !== guest.phone) guest.phone = r.guest_phone;
                    if (r.guest_email && r.guest_email !== guest.email) guest.email = r.guest_email;
                });
                
                // Convert to array and calculate stats
                allGuests = Array.from(guestMap.values()).map(guest => {
                    const confirmedBookings = guest.bookings.filter(b => b.status !== 'cancelled');
                    const totalSpent = confirmedBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
                    const totalNights = confirmedBookings.reduce((sum, b) => sum + (parseInt(b.nights) || 0), 0);
                    const lastBooking = confirmedBookings.length > 0 
                        ? new Date(Math.max(...confirmedBookings.map(b => new Date(b.check_in))))
                        : null;
                    
                    return {
                        ...guest,
                        totalBookings: confirmedBookings.length,
                        totalSpent,
                        totalNights,
                        lastVisit: lastBooking,
                        avgBookingValue: confirmedBookings.length > 0 ? totalSpent / confirmedBookings.length : 0,
                        isRepeat: confirmedBookings.length > 1,
                        isVIP: confirmedBookings.length >= 5,
                        isHighValue: totalSpent >= 50000
                    };
                });
                
                // Update summary statistics
                document.getElementById('guestStatTotal').textContent = allGuests.length;
                document.getElementById('guestStatRepeat').textContent = allGuests.filter(g => g.isRepeat).length;
                document.getElementById('guestStatVIP').textContent = allGuests.filter(g => g.isVIP).length;
                document.getElementById('guestStatHighValue').textContent = allGuests.filter(g => g.isHighValue).length;
                
                const avgStays = allGuests.length > 0 
                    ? (allGuests.reduce((sum, g) => sum + g.totalBookings, 0) / allGuests.length).toFixed(1)
                    : '0.0';
                document.getElementById('guestStatAvgStays').textContent = avgStays;
                
                // Load saved view preference
                const savedView = localStorage.getItem('guestViewPreference') || 'table';
                currentGuestView = savedView;
                
                // Initial display
                filteredGuests = [...allGuests];
                currentGuestPage = 1;
                
                // Restore saved filters
                setTimeout(() => {
                    const savedFilters = loadFilterState('guests');
                    if (savedFilters) {
                        console.log('🔄 Restoring guest filters:', savedFilters);
                        
                        // Restore search
                        if (savedFilters.search) {
                            const searchInput = document.getElementById('searchGuests');
                            if (searchInput) searchInput.value = savedFilters.search;
                        }
                        
                        // Restore type filter
                        if (savedFilters.typeFilter) {
                            const typeFilter = document.getElementById('guestTypeFilter');
                            if (typeFilter) typeFilter.value = savedFilters.typeFilter;
                        }
                        
                        // Restore sort
                        if (savedFilters.sortBy) {
                            currentSortColumn = savedFilters.sortBy;
                        }
                        
                        // Restore per page
                        if (savedFilters.perPage) {
                            const perPageSelect = document.getElementById('guestsPerPage');
                            if (perPageSelect) perPageSelect.value = savedFilters.perPage;
                            guestsPerPage = savedFilters.perPage === 'all' ? displayedGuests.length : parseInt(savedFilters.perPage);
                        }
                        
                        // Restore view (table/cards)
                        if (savedFilters.currentView) {
                            currentGuestView = savedFilters.currentView;
                            switchGuestView(savedFilters.currentView);
                        }
                        
                        // Restore page number
                        if (savedFilters.currentPage) {
                            currentGuestPage = savedFilters.currentPage;
                        }
                        
                        // Apply search if exists
                        if (savedFilters.search) {
                            searchGuests();
                        } else {
                            filterGuests();
                        }
                    } else {
                        filterGuests();
                    }
                }, 300);
                
            } catch (error) {
                console.error('Error loading guests:', error);
                showToast('Error', 'Failed to load guests: ' + error.message, '❌');
                
                // Show error in UI
                const tableBody = document.getElementById('guestTableBody');
                if (tableBody) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 60px 20px; color: var(--danger);">
                                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                                <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Error Loading Guests</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">${error.message}</div>
                            </td>
                        </tr>
                    `;
                }
            }
        }

        /**
         * Search guests by name, phone, or email (instant search)
         */
        function searchGuests() {
            const searchTerm = document.getElementById('searchGuests').value.toLowerCase().trim();
            
            if (!searchTerm) {
                filteredGuests = [...allGuests];
            } else {
                filteredGuests = allGuests.filter(g => 
                    (g.name || '').toLowerCase().includes(searchTerm) ||
                    (g.phone || '').toLowerCase().includes(searchTerm) ||
                    (g.email || '').toLowerCase().includes(searchTerm)
                );
            }
            
            currentGuestPage = 1; // Reset to first page
            filterGuests();
        }

        /**
         * Filter and sort guests
         */
        function filterGuests() {
            let guests = [...filteredGuests];
            
            // Apply type filter
            const typeFilter = document.getElementById('guestTypeFilter').value;
            if (typeFilter === 'repeat') {
                guests = guests.filter(g => g.isRepeat);
            } else if (typeFilter === 'new') {
                guests = guests.filter(g => !g.isRepeat);
            } else if (typeFilter === 'vip') {
                guests = guests.filter(g => g.isVIP);
            } else if (typeFilter === 'highvalue') {
                guests = guests.filter(g => g.isHighValue);
            }
            
            // Apply sorting
            sortGuestArray(guests);
            
            // Store for pagination
            displayedGuests = guests;
            
            // Auto-switch to cards if < 20 results, otherwise table
            if (guests.length > 0 && guests.length <= 20 && currentGuestView === 'table') {
                // Don't auto-switch, respect user preference
            }
            
            // Render based on current view
            if (currentGuestView === 'table') {
                renderGuestTable();
            } else {
                renderGuestCards();
            }
            // Save filter state
            const searchValue = document.getElementById('searchGuests')?.value || '';
            const sortBy = document.getElementById('guestSortBy')?.value || 'name';
            const perPage = document.getElementById('guestsPerPage')?.value || '50';
            
            saveFilterState('guests', {
                search: searchValue,
                typeFilter: typeFilter,
                sortBy: sortBy,
                perPage: perPage,
                currentView: currentGuestView,
                currentPage: currentGuestPage
            });
        }

        /**
         * Sort guest array by current sort column
         */
        function sortGuestArray(guests) {
            guests.sort((a, b) => {
                let aVal, bVal;
                
                switch(currentSortColumn) {
                    case 'name':
                        aVal = (a.name || '').toLowerCase();
                        bVal = (b.name || '').toLowerCase();
                        break;
                    case 'phone':
                        aVal = a.phone || '';
                        bVal = b.phone || '';
                        break;
                    case 'lastVisit':
                        aVal = a.lastVisit ? a.lastVisit.getTime() : 0;
                        bVal = b.lastVisit ? b.lastVisit.getTime() : 0;
                        break;
                    case 'stays':
                        aVal = a.totalBookings;
                        bVal = b.totalBookings;
                        break;
                    case 'spent':
                        aVal = a.totalSpent;
                        bVal = b.totalSpent;
                        break;
                    default:
                        aVal = a.name;
                        bVal = b.name;
                }
                
                if (aVal < bVal) return currentSortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        /**
         * Sort guests table by column
         */
        function sortGuestsTable(column) {
            if (currentSortColumn === column) {
                // Toggle direction
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = 'asc';
            }
            
            // Update sort icons
            document.querySelectorAll('[id^="sortIcon"]').forEach(el => el.textContent = '↕️');
            const icon = currentSortDirection === 'asc' ? '↑' : '↓';
            const iconId = 'sortIcon' + column.charAt(0).toUpperCase() + column.slice(1);
            const iconEl = document.getElementById(iconId);
            if (iconEl) iconEl.textContent = icon;
            
            filterGuests();
        }

        /**
         * Switch between table and card view
         */
        function switchGuestView(view) {
            currentGuestView = view;
            
            // Save preference
            localStorage.setItem('guestViewPreference', view);
            
            // Update button styles
            document.getElementById('tableViewBtn').style.background = view === 'table' ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('cardViewBtn').style.background = view === 'cards' ? 'var(--primary)' : 'var(--secondary)';
            
            // Show/hide views
            document.getElementById('guestTableView').style.display = view === 'table' ? 'block' : 'none';
            document.getElementById('guestCardView').style.display = view === 'cards' ? 'block' : 'none';
            
            // Re-render
            filterGuests();
        }

        /**
         * Change guests per page
         */
        function changeGuestsPerPage() {
            const value = document.getElementById('guestsPerPage').value;
            guestsPerPage = value === 'all' ? displayedGuests.length : parseInt(value);
            currentGuestPage = 1;
            filterGuests();
        }

        /**
         * Render guest table with pagination
         */
        function renderGuestTable() {
            const tbody = document.getElementById('guestTableBody');
            
            if (displayedGuests.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                            <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No guests found</div>
                            <div style="font-size: 14px;">Try adjusting your search or filters</div>
                        </td>
                    </tr>
                `;
                document.getElementById('guestPagination').style.display = 'none';
                return;
            }
            
            // Pagination logic
            const totalGuests = displayedGuests.length;
            const totalPages = Math.ceil(totalGuests / guestsPerPage);
            const startIdx = (currentGuestPage - 1) * guestsPerPage;
            const endIdx = Math.min(startIdx + guestsPerPage, totalGuests);
            const pageGuests = displayedGuests.slice(startIdx, endIdx);
            
            // Update pagination info
            document.getElementById('guestShowingStart').textContent = totalGuests > 0 ? startIdx + 1 : 0;
            document.getElementById('guestShowingEnd').textContent = endIdx;
            document.getElementById('guestShowingTotal').textContent = totalGuests;
            document.getElementById('guestPagination').style.display = 'flex';
            
            // Render table rows
            let html = '';
            pageGuests.forEach(guest => {
                const guestBadge = guest.isVIP ? '<span style="background: var(--warning); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 6px;">👑 VIP</span>' :
                                   guest.isRepeat ? '<span style="background: var(--success); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 6px;">🌟</span>' :
                                   '<span style="background: var(--primary); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 6px;">✨</span>';
                
                const lastVisitText = guest.lastVisit ? formatDate(guest.lastVisit) : 'Never';
                const contactInfo = guest.phone ? `📱 ${guest.phone}` : (guest.email ? `📧 ${guest.email}` : 'No contact');
                
                html += `
                    <tr style="cursor: pointer;" onclick="showGuestDetail('${guest.key.replace(/'/g, "\\'")}')">
                        <td data-label="Guest Name">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 36px; height: 36px; background: var(--gradient-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; flex-shrink: 0;">
                                    ${(guest.name || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <strong>${guest.name || 'Unknown Guest'}</strong>
                                    ${guestBadge}
                                </div>
                            </div>
                        </td>
                        <td data-label="Contact">
                            <div style="font-size: 13px;">
                                ${guest.phone ? `<div>📱 ${guest.phone}</div>` : ''}
                                ${guest.email ? `<div style="color: var(--text-secondary);">📧 ${guest.email}</div>` : ''}
                                ${!guest.phone && !guest.email ? '<span style="color: var(--text-secondary);">No contact</span>' : ''}
                            </div>
                        </td>
                        <td data-label="Last Visit">${lastVisitText}</td>
                        <td data-label="Stays"><strong>${guest.totalBookings}</strong></td>
                        <td data-label="Total Spent"><strong style="color: var(--success);">${formatCurrency(guest.totalSpent)}</strong></td>
                        <td data-label="Actions">
                            <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); showGuestDetail('${guest.key.replace(/'/g, "\\'")}')">
                                👁️ View
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html;
            
            // Render pagination buttons
            renderPaginationButtons(totalPages);
        }

        /**
         * Render pagination buttons
         */
        function renderPaginationButtons(totalPages) {
            const container = document.getElementById('guestPaginationButtons');
            
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }
            
            let html = '';
            
            // Previous button
            html += `
                <button class="btn btn-sm btn-secondary" 
                        onclick="changeGuestPage(${currentGuestPage - 1})" 
                        ${currentGuestPage === 1 ? 'disabled' : ''}>
                    ◀ Prev
                </button>
            `;
            
            // Page numbers
            const maxButtons = 7;
            let startPage = Math.max(1, currentGuestPage - Math.floor(maxButtons / 2));
            let endPage = Math.min(totalPages, startPage + maxButtons - 1);
            
            if (endPage - startPage < maxButtons - 1) {
                startPage = Math.max(1, endPage - maxButtons + 1);
            }
            
            if (startPage > 1) {
                html += `<button class="btn btn-sm btn-secondary" onclick="changeGuestPage(1)">1</button>`;
                if (startPage > 2) html += `<span style="padding: 0 8px;">...</span>`;
            }
            
            for (let i = startPage; i <= endPage; i++) {
                const isActive = i === currentGuestPage;
                html += `
                    <button class="btn btn-sm" 
                            onclick="changeGuestPage(${i})"
                            style="background: ${isActive ? 'var(--primary)' : 'var(--secondary)'}; color: white;">
                        ${i}
                    </button>
                `;
            }
            
            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<span style="padding: 0 8px;">...</span>`;
                html += `<button class="btn btn-sm btn-secondary" onclick="changeGuestPage(${totalPages})">${totalPages}</button>`;
            }
            
            // Next button
            html += `
                <button class="btn btn-sm btn-secondary" 
                        onclick="changeGuestPage(${currentGuestPage + 1})" 
                        ${currentGuestPage === totalPages ? 'disabled' : ''}>
                    Next ▶
                </button>
            `;
            
            container.innerHTML = html;
        }

        /**
         * Change page
         */
        function changeGuestPage(page) {
            const totalPages = Math.ceil(displayedGuests.length / guestsPerPage);
            if (page < 1 || page > totalPages) return;
            
            currentGuestPage = page;
            renderGuestTable();
            
            // Scroll to top of table
            document.getElementById('guestTableView').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        /**
         * Render guest cards (compact grid version)
         */
        function renderGuestCards() {
            const container = document.getElementById('guestListContainer');
            
            if (displayedGuests.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                        <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No guests found</div>
                        <div style="font-size: 14px;">Try adjusting your search or filters</div>
                    </div>
                `;
                return;
            }
            
            // Pagination for cards
            const totalGuests = displayedGuests.length;
            const startIdx = (currentGuestPage - 1) * guestsPerPage;
            const endIdx = Math.min(startIdx + guestsPerPage, totalGuests);
            const pageGuests = displayedGuests.slice(startIdx, endIdx);
            
            let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">';
            
            pageGuests.forEach(guest => {
                const guestBadge = guest.isVIP ? '👑 VIP' : guest.isRepeat ? '🌟 Repeat' : '✨ New';
                const badgeColor = guest.isVIP ? 'var(--warning)' : guest.isRepeat ? 'var(--success)' : 'var(--primary)';
                const lastVisitText = guest.lastVisit ? formatDate(guest.lastVisit) : 'Never';
                
                html += `
                    <div class="stat-card" style="cursor: pointer; transition: all 0.3s ease;" onclick="showGuestDetail('${guest.key.replace(/'/g, "\\'")}')">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                    <div style="width: 40px; height: 40px; background: var(--gradient-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; color: white;">
                                        ${(guest.name || '?')[0].toUpperCase()}
                                    </div>
                                    <div style="flex: 1;">
                                        <h4 style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0;">${guest.name || 'Unknown'}</h4>
                                        <div style="display: inline-block; padding: 2px 8px; background: ${badgeColor}; color: white; border-radius: 10px; font-size: 10px; font-weight: 600;">
                                            ${guestBadge}
                                        </div>
                                    </div>
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    ${guest.phone ? `<div>📱 ${guest.phone}</div>` : ''}
                                    ${guest.email ? `<div>📧 ${guest.email}</div>` : ''}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 20px; font-weight: 700; color: var(--success);">${formatCurrency(guest.totalSpent)}</div>
                                <div style="font-size: 11px; color: var(--text-secondary);">Total</div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding-top: 12px; border-top: 1px solid var(--border);">
                            <div style="text-align: center;">
                                <div style="font-size: 18px; font-weight: 700; color: var(--primary);">${guest.totalBookings}</div>
                                <div style="font-size: 10px; color: var(--text-secondary);">Stays</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 18px; font-weight: 700; color: var(--text-primary);">${guest.totalNights}</div>
                                <div style="font-size: 10px; color: var(--text-secondary);">Nights</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 18px; font-weight: 700; color: var(--text-secondary);">${lastVisitText}</div>
                                <div style="font-size: 10px; color: var(--text-secondary);">Last</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            
            // Add pagination for cards if needed
            const totalPages = Math.ceil(totalGuests / guestsPerPage);
            if (totalPages > 1) {
                html += `
                    <div style="display: flex; justify-content: center; align-items: center; padding: 20px; gap: 8px;">
                        ${renderCardPaginationHTML(totalPages)}
                    </div>
                `;
            }
            
            container.innerHTML = html;
        }

        /**
         * Render pagination HTML for cards
         */
        function renderCardPaginationHTML(totalPages) {
            let html = `
                <button class="btn btn-sm btn-secondary" 
                        onclick="changeGuestPage(${currentGuestPage - 1})" 
                        ${currentGuestPage === 1 ? 'disabled' : ''}>
                    ◀ Prev
                </button>
            `;
            
            for (let i = 1; i <= Math.min(5, totalPages); i++) {
                const isActive = i === currentGuestPage;
                html += `
                    <button class="btn btn-sm" 
                            onclick="changeGuestPage(${i})"
                            style="background: ${isActive ? 'var(--primary)' : 'var(--secondary)'}; color: white;">
                        ${i}
                    </button>
                `;
            }
            
            if (totalPages > 5) {
                html += `<span>...</span>`;
            }
            
            html += `
                <button class="btn btn-sm btn-secondary" 
                        onclick="changeGuestPage(${currentGuestPage + 1})" 
                        ${currentGuestPage === totalPages ? 'disabled' : ''}>
                    Next ▶
                </button>
            `;
            
            return html;
        }

        /**
         * Show guest detail modal
         */
        function showGuestDetail(guestKey) {
            const guest = allGuests.find(g => g.key === guestKey);
            if (!guest) return;
            
            currentGuestData = guest;
            
            // Update profile section
            document.getElementById('guestDetailName').textContent = guest.name || 'Unknown Guest';
            document.getElementById('guestDetailNameHeader').textContent = guest.name || 'Unknown Guest';
            document.getElementById('guestDetailPhone').textContent = guest.phone || 'No phone';
            document.getElementById('guestDetailEmail').textContent = guest.email || 'No email';
            
            // Update badge
            const badge = guest.isVIP ? '👑 VIP Guest' : guest.isRepeat ? '🌟 Repeat Guest' : '✨ New Guest';
            document.getElementById('guestDetailBadge').textContent = badge;
            
            // Update statistics
            document.getElementById('guestDetailTotalBookings').textContent = guest.totalBookings;
            document.getElementById('guestDetailTotalNights').textContent = guest.totalNights;
            document.getElementById('guestDetailTotalSpent').textContent = formatCurrency(guest.totalSpent);
            document.getElementById('guestDetailAvgValue').textContent = formatCurrency(guest.avgBookingValue);
            document.getElementById('guestDetailLastVisit').textContent = guest.lastVisit 
                ? formatDate(guest.lastVisit)
                : 'Never';
            
            // Update booking count
            document.getElementById('guestDetailBookingCount').textContent = guest.totalBookings;
            
            // Render booking history
            const historyHtml = guest.bookings
                .sort((a, b) => new Date(b.check_in) - new Date(a.check_in))
                .map(booking => {
                    const statusColors = {
                        'confirmed': 'var(--success)',
                        'pending': 'var(--warning)',
                        'checked-in': 'var(--primary)',
                        'checked-out': 'var(--text-secondary)',
                        'cancelled': 'var(--danger)'
                    };
                    
                    return `
                        <div style="padding: 16px; background: var(--background-alt); border-radius: 8px; border-left: 4px solid ${statusColors[booking.status] || 'var(--border)'};">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <div>
                                    <div style="font-weight: 600; margin-bottom: 4px;">${booking.property_name || 'Property'}</div>
                                    <div style="font-size: 13px; color: var(--text-secondary);">
                                        📅 ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)} 
                                        <span style="color: var(--text-primary); font-weight: 600;">(${booking.nights} nights)</span>
                                    </div>
                                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                                        Booking ID: ${booking.booking_id || 'N/A'}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 18px; font-weight: 700; color: var(--success);">
                                        ${formatCurrency(booking.total_amount)}
                                    </div>
                                    <div style="font-size: 11px; padding: 3px 8px; background: ${statusColors[booking.status] || 'var(--border)'}; color: white; border-radius: 12px; margin-top: 4px; display: inline-block;">
                                        ${booking.status}
                                    </div>
                                </div>
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
                                👥 ${booking.adults || 0} adults${booking.kids ? `, ${booking.kids} kids` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            
            document.getElementById('guestDetailBookingHistory').innerHTML = historyHtml;
            
            // Show modal
            document.getElementById('guestDetailModal').classList.add('active');
        }

        /**
         * Close guest detail modal
         */
        function closeGuestDetailModal() {
            document.getElementById('guestDetailModal').classList.remove('active');
            currentGuestData = null;
        }

        /**
         * Edit guest information
         */
        function editGuestInfo() {
            if (!currentGuestData) return;
            
            document.getElementById('editGuestName').value = currentGuestData.name || '';
            document.getElementById('editGuestPhone').value = currentGuestData.phone || '';
            document.getElementById('editGuestEmail').value = currentGuestData.email || '';
            document.getElementById('editGuestOriginalPhone').value = currentGuestData.phone || '';
            document.getElementById('editGuestOriginalEmail').value = currentGuestData.email || '';
            
            document.getElementById('editGuestModal').classList.add('active');
        }

        /**
         * Close edit guest modal
         */
        function closeEditGuestModal() {
            document.getElementById('editGuestModal').classList.remove('active');
        }

        /**
         * Save guest information
         */
        async function saveGuestInfo() {
            if (!currentGuestData) return;
            
            const newName = document.getElementById('editGuestName').value.trim();
            const newPhone = document.getElementById('editGuestPhone').value.trim();
            const newEmail = document.getElementById('editGuestEmail').value.trim();
            
            if (!newName) {
                showToast('Validation Error', 'Guest name is required', '❌');
                return;
            }
            
            try {
                // Update all bookings for this guest
                const updates = {
                    guest_name: newName,
                    guest_phone: newPhone,
                    guest_email: newEmail
                };
                
                // Find all booking IDs for this guest
                const bookingIds = currentGuestData.bookings.map(b => b.booking_id);
                
                // Update in database
                for (const bookingId of bookingIds) {
                    await supabase
                        .from('reservations')
                        .update(updates)
                        .eq('booking_id', bookingId);
                }
                
                closeEditGuestModal();
                closeGuestDetailModal();
                
                // Reload guests
                await loadGuests();
                
                showToast('Success', `Updated information for ${newName}`, '✅');
                
            } catch (error) {
                console.error('Error updating guest:', error);
                showToast('Error', 'Failed to update guest information', '❌');
            }
        }

        /**
         * Call guest
         */
        function callGuest() {
            if (!currentGuestData || !currentGuestData.phone) {
                showToast('No Phone', 'Guest phone number not available', '⚠️');
                return;
            }
            window.location.href = `tel:${currentGuestData.phone}`;
        }

        /**
         * WhatsApp guest
         */
        function whatsappGuest() {
            if (!currentGuestData || !currentGuestData.phone) {
                showToast('No Phone', 'Guest phone number not available', '⚠️');
                return;
            }
            
            let phone = currentGuestData.phone.replace(/[^0-9]/g, '');
            if (!phone.startsWith('91') && phone.length === 10) {
                phone = '91' + phone;
            }
            
            const message = encodeURIComponent(`Hello ${currentGuestData.name}, this is ResIQ by Hostizzy.`);
            window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
        }

        /**
         * Email guest
         */
        function emailGuest() {
            if (!currentGuestData || !currentGuestData.email) {
                showToast('No Email', 'Guest email not available', '⚠️');
                return;
            }
            window.location.href = `mailto:${currentGuestData.email}`;
        }

        /**
         * Clear guest filters
         */
        function clearGuestFilters() {
            document.getElementById('searchGuests').value = '';
            document.getElementById('guestTypeFilter').value = '';
            document.getElementById('guestSortBy').value = 'name';
            document.getElementById('guestsPerPage').value = '50';
            guestsPerPage = 50;
            currentGuestPage = 1;
            currentSortColumn = 'name';
            currentSortDirection = 'asc';
            filteredGuests = [...allGuests];
            
            // Clear saved filter state
            clearFilterState('guests');
            
            filterGuests();
        }

        /**
         * Export guests to CSV
         */
        function exportGuestsCSV() {
            const guestsToExport = displayedGuests.length > 0 ? displayedGuests : allGuests;
            
            if (guestsToExport.length === 0) {
                showToast('No Data', 'No guests to export', '⚠️');
                return;
            }
            
            // Prepare CSV data
            const headers = ['Name', 'Phone', 'Email', 'Total Bookings', 'Total Nights', 'Total Spent', 'Avg Booking Value', 'Last Visit', 'Guest Type'];
            
            const rows = guestsToExport.map(g => [
                g.name || '',
                g.phone || '',
                g.email || '',
                g.totalBookings,
                g.totalNights,
                g.totalSpent,
                g.avgBookingValue.toFixed(2),
                g.lastVisit ? formatDate(g.lastVisit) : 'Never',
                g.isVIP ? 'VIP' : g.isRepeat ? 'Repeat' : 'New'
            ]);
            
            // Create CSV
            let csv = headers.join(',') + '\n';
            rows.forEach(row => {
                csv += row.map(cell => {
                    // Escape quotes and wrap in quotes if contains comma
                    const cellStr = String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(',') + '\n';
            });
            
            // Download
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `guests_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('Exported', `${guestsToExport.length} guests exported to CSV`, '✅');
        }

        // ==========================================
        // MORE DROPDOWN & USER MENU
        // ==========================================
        
        /**
         * Toggle More dropdown menu
         */
        function toggleMoreDropdown() {
            const menu = document.getElementById('moreDropdownMenu');
            const btn = document.querySelector('.more-dropdown-btn');
            
            // Close user menu if open
            closeUserMenu();
            
            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
            } else {
                menu.classList.add('active');
            }
        }
        
        /**
         * Close More dropdown
         */
        function closeMoreDropdown() {
            const menu = document.getElementById('moreDropdownMenu');
            if (menu) {
                menu.classList.remove('active');
            }
        }
        
        /**
         * Toggle User menu dropdown
         */
        function toggleUserMenu() {
            const dropdown = document.getElementById('userMenuDropdown');
            const btn = document.querySelector('.user-menu-btn');
            
            // Close more dropdown if open
            closeMoreDropdown();
            
            if (dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
                btn.classList.remove('active');
            } else {
                dropdown.classList.add('active');
                btn.classList.add('active');
            }
        }
        
        /**
         * Close User menu
         */
        function closeUserMenu() {
            const dropdown = document.getElementById('userMenuDropdown');
            const btn = document.querySelector('.user-menu-btn');
            
            if (dropdown) {
                dropdown.classList.remove('active');
            }
            if (btn) {
                btn.classList.remove('active');
            }
        }
        
        /**
         * Close dropdowns when clicking outside
         */
        document.addEventListener('click', (e) => {
            // Close More dropdown
            if (!e.target.closest('.more-dropdown-container')) {
                closeMoreDropdown();
            }
            
            // Close User menu
            if (!e.target.closest('.user-menu-container')) {
                closeUserMenu();
            }
        });
        
        /**
         * Update user email in both locations
         */
        function updateUserEmailDisplay(email) {
            const emailSpan = document.getElementById('userEmail');
            const emailDropdown = document.getElementById('userEmailDropdown');
            
            if (emailSpan) emailSpan.textContent = email;
            if (emailDropdown) emailDropdown.textContent = email;
        }

</script>
    <!-- Quick Actions Panel -->
    <div id="quickActionsOverlay" class="quick-actions-overlay" onclick="closeQuickActions(event)">
        <div class="quick-actions-panel" onclick="event.stopPropagation()">
            <div class="quick-actions-search">
                <input type="text" id="quickActionsSearch" placeholder="Type a command or search..." autocomplete="off" onkeyup="filterQuickActions(event)">
                <button class="quick-actions-voice-btn" onclick="startVoiceCommand()" id="voiceCommandBtn" title="Voice Commands">
                    🎤
                </button>
            </div>
            
            <div class="quick-actions-list" id="quickActionsList">
                <!-- Will be populated by JavaScript -->
            </div>
            
            <div class="quick-actions-footer">
                <div>
                    <kbd>↑</kbd> <kbd>↓</kbd> to navigate • <kbd>Enter</kbd> to select
                </div>
                <div>
                    <kbd>Esc</kbd> to close
                </div>
            </div>
        </div>
    </div>

    <!-- Floating Quick Action Button -->
    <button class="quick-action-fab" onclick="openQuickActions()" title="Quick Actions (Ctrl+K)">
        ⚡
    </button>

    <!-- Keyboard Shortcuts Help Button (Desktop Only) -->
    <button class="keyboard-shortcuts-fab" onclick="showKeyboardShortcuts()" 
            title="Keyboard Shortcuts (?)">
        ⌨️
    </button>

    <!-- Keyboard Shortcuts Modal -->
    <div id="keyboardShortcutsModal" class="modal">
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>⌨️ Keyboard Shortcuts</h2>
                <button class="close-modal" onclick="closeKeyboardShortcuts()">×</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                <div style="display: grid; gap: 20px;">
                    <div>
                        <h3 style="color: var(--primary); margin-bottom: 12px;">Navigation</h3>
                        <div style="display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Home View</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 1</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Dashboard</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 2</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Reservations</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 3</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Payments</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 4</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Availability</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 5</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Properties</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 6</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Performance</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 7</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Team</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Alt + 8</kbd>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="color: var(--primary); margin-bottom: 12px;">Actions</h3>
                        <div style="display: grid; gap: 8px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Quick Actions</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Ctrl/Cmd + K</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Save Form</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Ctrl/Cmd + S</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Close Modal</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">Esc</kbd>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border-radius: 6px;">
                                <span>Show Shortcuts</span>
                                <kbd style="background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">?</kbd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <!-- Guest Detail Modal -->
    <div id="guestDetailModal" class="modal">
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2 id="guestDetailName">Guest Profile</h2>
                <button class="close-modal" onclick="closeGuestDetailModal()">×</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <!-- Guest Profile Card -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 16px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px;">
