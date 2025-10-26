// Session Management Service
class SessionManager {
    constructor() {
        this.currentSessionId = null;
    }

    /**
     * Get device and browser information
     */
    getDeviceInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        let os = 'Unknown';

        // Detect browser
        if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
        else if (ua.indexOf('Chrome') > -1) browser = 'Chrome';
        else if (ua.indexOf('Safari') > -1) browser = 'Safari';
        else if (ua.indexOf('Edge') > -1) browser = 'Edge';
        else if (ua.indexOf('Opera') > -1) browser = 'Opera';

        // Detect OS
        if (ua.indexOf('Windows') > -1) os = 'Windows';
        else if (ua.indexOf('Mac') > -1) os = 'macOS';
        else if (ua.indexOf('Linux') > -1) os = 'Linux';
        else if (ua.indexOf('Android') > -1) os = 'Android';
        else if (ua.indexOf('iOS') > -1) os = 'iOS';

        return {
            browser,
            os,
            deviceInfo: `${browser} on ${os}`
        };
    }

    /**
     * Create a hash of the session token for storage
     */
    async hashToken(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Create a new session record or reuse existing one
     */
    async createSession() {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            
            if (sessionError || !session) {
                console.error('❌ No active session found');
                return null;
            }

            const tokenHash = await this.hashToken(session.access_token);
            const deviceInfo = this.getDeviceInfo();

            // Check if session already exists for this token
            const { data: existingSession } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('session_token_hash', tokenHash)
                .is('revoked_at', null)
                .single();

            if (existingSession) {
                // Session exists, just update it
                this.currentSessionId = existingSession.id;
                console.log('✅ Existing session found, reusing:', existingSession.id);
                
                // Mark as current and update activity
                await supabaseClient
                    .from('sessions')
                    .update({ 
                        is_current: true,
                        last_active: new Date().toISOString()
                    })
                    .eq('id', existingSession.id);
                
                return existingSession;
            }

            // No existing session, create new one
            console.log('📝 Creating new session...');

            // Mark all other sessions for this user as not current
            await supabaseClient
                .from('sessions')
                .update({ is_current: false })
                .eq('user_id', session.user.id);

            // Create new session record
            const { data, error } = await supabaseClient
                .from('sessions')
                .insert({
                    user_id: session.user.id,
                    session_token_hash: tokenHash,
                    device_info: deviceInfo.deviceInfo,
                    browser: deviceInfo.browser,
                    os: deviceInfo.os,
                    is_current: true
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Failed to create session:', error);
                return null;
            }

            this.currentSessionId = data.id;
            console.log('✅ New session created:', data.id);
            return data;
        } catch (error) {
            console.error('❌ Error creating session:', error);
            return null;
        }
    }

    /**
     * Update session activity timestamp
     */
    async updateActivity() {
        if (!this.currentSessionId) {
            console.warn('⚠️ No current session ID');
            return;
        }

        try {
            await supabaseClient
                .from('sessions')
                .update({ last_active: new Date().toISOString() })
                .eq('id', this.currentSessionId);
        } catch (error) {
            console.error('❌ Failed to update session activity:', error);
        }
    }

    /**
     * Check if current session is valid (not revoked)
     */
    async validateSession() {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            
            if (sessionError || !session) {
                return false;
            }

            const tokenHash = await this.hashToken(session.access_token);

            const { data, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('session_token_hash', tokenHash)
                .is('revoked_at', null)
                .single();

            if (error || !data) {
                console.warn('⚠️ Session not found or revoked');
                return false;
            }

            this.currentSessionId = data.id;
            await this.updateActivity();
            return true;
        } catch (error) {
            console.error('❌ Session validation error:', error);
            return false;
        }
    }

    /**
     * Get all sessions for current user
     */
    async getAllSessions() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            
            if (!user) {
                throw new Error('Not authenticated');
            }

            const { data, error } = await supabaseClient
                .from('sessions')
                .select('*')
                .eq('user_id', user.id)
                .is('revoked_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Failed to fetch sessions:', error);
            throw error;
        }
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(sessionId) {
        try {
            const { error } = await supabaseClient
                .from('sessions')
                .update({ revoked_at: new Date().toISOString() })
                .eq('id', sessionId);

            if (error) {
                throw error;
            }

            console.log('✅ Session revoked:', sessionId);
            
            // If revoking current session, logout
            if (sessionId === this.currentSessionId) {
                await supabaseClient.auth.signOut();
                window.location.href = 'login.html';
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to revoke session:', error);
            throw error;
        }
    }

    /**
     * Revoke all other sessions except current
     */
    async revokeAllOtherSessions() {
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            
            if (!user) {
                throw new Error('Not authenticated');
            }

            const { error } = await supabaseClient
                .from('sessions')
                .update({ revoked_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .neq('id', this.currentSessionId)
                .is('revoked_at', null);

            if (error) {
                throw error;
            }

            console.log('✅ All other sessions revoked');
            return true;
        } catch (error) {
            console.error('❌ Failed to revoke other sessions:', error);
            throw error;
        }
    }
}

// Global instance
const sessionManager = new SessionManager();
