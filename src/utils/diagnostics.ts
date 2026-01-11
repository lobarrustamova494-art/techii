/**
 * EvalBee Production Diagnostics Utility
 * Helps diagnose and troubleshoot production service issues
 */

interface ServiceStatus {
  name: string
  url: string
  status: 'online' | 'offline' | 'slow' | 'error'
  responseTime: number
  error?: string
  details?: any
}

interface DiagnosticResult {
  timestamp: string
  services: ServiceStatus[]
  networkInfo: {
    online: boolean
    effectiveType?: string
    downlink?: number
  }
  browserInfo: {
    userAgent: string
    language: string
    platform: string
  }
  recommendations: string[]
}

export class EvalBeeDiagnostics {
  private static instance: EvalBeeDiagnostics
  
  public static getInstance(): EvalBeeDiagnostics {
    if (!EvalBeeDiagnostics.instance) {
      EvalBeeDiagnostics.instance = new EvalBeeDiagnostics()
    }
    return EvalBeeDiagnostics.instance
  }

  async runDiagnostics(): Promise<DiagnosticResult> {
    console.log('🔍 Running EvalBee production diagnostics...')
    
    const services = [
      {
        name: 'Python OMR Service',
        url: import.meta.env.VITE_PYTHON_OMR_URL || 'https://ultra-precision-python-omr.onrender.com'
      },
      {
        name: 'Node.js Backend',
        url: import.meta.env.VITE_API_BASE_URL || 'https://ultra-precision-omr-backend.onrender.com/api'
      }
    ]

    const serviceStatuses = await Promise.all(
      services.map(service => this.checkServiceStatus(service))
    )

    const networkInfo = this.getNetworkInfo()
    const browserInfo = this.getBrowserInfo()
    const recommendations = this.generateRecommendations(serviceStatuses, networkInfo)

    const result: DiagnosticResult = {
      timestamp: new Date().toISOString(),
      services: serviceStatuses,
      networkInfo,
      browserInfo,
      recommendations
    }

    console.log('📊 Diagnostic results:', result)
    return result
  }

  private async checkServiceStatus(service: { name: string; url: string }): Promise<ServiceStatus> {
    const startTime = Date.now()
    
    try {
      // For Python OMR service, check health endpoint
      const healthUrl = service.name.includes('Python') 
        ? `${service.url}/health`
        : `${service.url}/health`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        
        return {
          name: service.name,
          url: service.url,
          status: responseTime > 5000 ? 'slow' : 'online',
          responseTime,
          details: data
        }
      } else {
        return {
          name: service.name,
          url: service.url,
          status: 'error',
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime
      
      let errorMessage = error.message
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout (>10s)'
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error or service unavailable'
      }

      return {
        name: service.name,
        url: service.url,
        status: 'offline',
        responseTime,
        error: errorMessage
      }
    }
  }

  private getNetworkInfo() {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink
    }
  }

  private getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform
    }
  }

  private generateRecommendations(services: ServiceStatus[], networkInfo: any): string[] {
    const recommendations: string[] = []

    // Network recommendations
    if (!networkInfo.online) {
      recommendations.push('Internet aloqasi yo\'q. Iltimos, internet ulanishingizni tekshiring.')
    } else if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      recommendations.push('Sekin internet aloqasi aniqlandi. WiFi yoki tezroq mobil internetdan foydalaning.')
    }

    // Service-specific recommendations
    const offlineServices = services.filter(s => s.status === 'offline')
    const slowServices = services.filter(s => s.status === 'slow')
    const errorServices = services.filter(s => s.status === 'error')

    if (offlineServices.length > 0) {
      recommendations.push(`${offlineServices.length} ta xizmat ishlamayapti. Biroz kutib qayta urinib ko'ring.`)
    }

    if (slowServices.length > 0) {
      recommendations.push(`${slowServices.length} ta xizmat sekin ishlayapti. Sabr qiling yoki qayta urinib ko'ring.`)
    }

    if (errorServices.length > 0) {
      recommendations.push(`${errorServices.length} ta xizmatda xatolik. Sahifani yangilab qayta urinib ko'ring.`)
    }

    // All services working
    if (services.every(s => s.status === 'online')) {
      recommendations.push('Barcha xizmatlar normal ishlayapti. Muammo mahalliy bo\'lishi mumkin.')
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Sahifani yangilab qayta urinib ko\'ring.')
      recommendations.push('Brauzer keshini tozalab qayta urinib ko\'ring.')
    }

    return recommendations
  }

  async exportDiagnostics(): Promise<string> {
    const result = await this.runDiagnostics()
    
    const report = `
EvalBee Production Diagnostics Report
=====================================
Generated: ${result.timestamp}

SERVICES STATUS:
${result.services.map(service => `
- ${service.name}
  URL: ${service.url}
  Status: ${service.status.toUpperCase()}
  Response Time: ${service.responseTime}ms
  ${service.error ? `Error: ${service.error}` : ''}
`).join('')}

NETWORK INFO:
- Online: ${result.networkInfo.online}
- Connection Type: ${result.networkInfo.effectiveType || 'Unknown'}
- Download Speed: ${result.networkInfo.downlink || 'Unknown'} Mbps

BROWSER INFO:
- User Agent: ${result.browserInfo.userAgent}
- Language: ${result.browserInfo.language}
- Platform: ${result.browserInfo.platform}

RECOMMENDATIONS:
${result.recommendations.map(rec => `- ${rec}`).join('\n')}

---
EvalBee Professional OMR System
Generated by diagnostics utility
`

    return report
  }
}

// Export singleton instance
export const diagnostics = EvalBeeDiagnostics.getInstance()