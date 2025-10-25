// VirusTotal API Integration Service
class VirusTotalService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://www.virustotal.com/api/v3';
    }

    /**
     * Upload and scan a file with VirusTotal
     * @param {File} file - The file to scan
     * @returns {Promise<Object>} Scan result with analysis ID
     */
    async scanFile(file) {
        try {
            console.log('🦠 Uploading file to VirusTotal:', file.name);
            
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.baseUrl}/files`, {
                method: 'POST',
                headers: {
                    'x-apikey': this.apiKey
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg;
                try {
                    const error = JSON.parse(errorText);
                    errorMsg = error.error?.message || response.statusText;
                } catch {
                    errorMsg = response.statusText;
                }
                throw new Error(`VirusTotal API error (${response.status}): ${errorMsg}`);
            }

            const result = await response.json();
            console.log('✅ VirusTotal scan initiated:', result);
            
            return {
                scanId: result.data.id,
                status: 'scanning'
            };
        } catch (error) {
            console.error('❌ VirusTotal scan failed:', error);
            
            // Check if it's a CORS error
            if (error.message.includes('CORS') || error.name === 'TypeError') {
                throw new Error('VirusTotal scanning requires a backend proxy due to CORS restrictions. File uploaded without virus scan.');
            }
            
            throw error;
        }
    }

    /**
     * Get scan analysis results
     * @param {string} scanId - The analysis ID from scanFile
     * @returns {Promise<Object>} Analysis results
     */
    async getAnalysis(scanId) {
        try {
            console.log('🔍 Fetching VirusTotal analysis:', scanId);
            
            const response = await fetch(`${this.baseUrl}/analyses/${scanId}`, {
                method: 'GET',
                headers: {
                    'x-apikey': this.apiKey
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`VirusTotal API error: ${error.error?.message || response.statusText}`);
            }

            const result = await response.json();
            const attributes = result.data.attributes;
            
            console.log('📊 VirusTotal analysis:', attributes);
            
            return {
                status: attributes.status,
                stats: attributes.stats,
                results: attributes.results,
                scanDate: attributes.date,
                permalink: `https://www.virustotal.com/gui/file-analysis/${scanId}`
            };
        } catch (error) {
            console.error('❌ Failed to get VirusTotal analysis:', error);
            throw error;
        }
    }

    /**
     * Get file report by hash (SHA-256)
     * @param {string} fileHash - SHA-256 hash of the file
     * @returns {Promise<Object>} File analysis report
     */
    async getFileReport(fileHash) {
        try {
            console.log('🔍 Fetching VirusTotal file report:', fileHash);
            
            const response = await fetch(`${this.baseUrl}/files/${fileHash}`, {
                method: 'GET',
                headers: {
                    'x-apikey': this.apiKey
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null; // File not in VT database
                }
                const error = await response.json();
                throw new Error(`VirusTotal API error: ${error.error?.message || response.statusText}`);
            }

            const result = await response.json();
            const attributes = result.data.attributes;
            
            return {
                sha256: attributes.sha256,
                stats: attributes.last_analysis_stats,
                results: attributes.last_analysis_results,
                scanDate: attributes.last_analysis_date,
                permalink: `https://www.virustotal.com/gui/file/${fileHash}`
            };
        } catch (error) {
            console.error('❌ Failed to get file report:', error);
            throw error;
        }
    }

    /**
     * Parse analysis results into a simple threat assessment
     * @param {Object} analysis - Analysis result from getAnalysis
     * @returns {Object} Simplified threat info
     */
    parseThreatInfo(analysis) {
        if (!analysis || !analysis.stats) {
            return {
                isSafe: null,
                positives: 0,
                total: 0,
                threatLabel: 'Unknown',
                color: '#999',
                icon: '❓'
            };
        }

        const stats = analysis.stats;
        const positives = stats.malicious + stats.suspicious;
        const total = positives + stats.harmless + stats.undetected;

        let isSafe = positives === 0;
        let threatLabel = 'Clean';
        let color = '#4CAF50';
        let icon = '✅';

        if (positives > 0) {
            if (positives >= 5) {
                threatLabel = 'Malicious';
                color = '#f44336';
                icon = '🚨';
                isSafe = false;
            } else if (positives >= 2) {
                threatLabel = 'Suspicious';
                color = '#ff9800';
                icon = '⚠️';
                isSafe = false;
            } else {
                threatLabel = 'Low Risk';
                color = '#FFC107';
                icon = '⚠️';
                isSafe = false;
            }
        }

        return {
            isSafe,
            positives,
            total,
            threatLabel,
            color,
            icon,
            scanDate: analysis.scanDate,
            permalink: analysis.permalink
        };
    }

    /**
     * Calculate SHA-256 hash of a file
     * @param {File} file - The file to hash
     * @returns {Promise<string>} Hex string of SHA-256 hash
     */
    async calculateFileHash(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }
}

// Global instance - auto-initialize with API key from config
let virusTotalService = null;

// Auto-initialize when config is loaded
if (typeof VIRUSTOTAL_API_KEY !== 'undefined' && VIRUSTOTAL_API_KEY) {
    virusTotalService = new VirusTotalService(VIRUSTOTAL_API_KEY);
    console.log('✅ VirusTotal service initialized with API key');
} else {
    console.warn('⚠️ VirusTotal API key not found - file scanning will be disabled');
}
