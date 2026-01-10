/**
 * Performance monitoring utilities
 * Helps track and optimize component loading times
 */

interface PerformanceMetric {
  name: string
  startTime: number
  endTime?: number
  duration?: number
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map()
  private enabled: boolean = import.meta.env?.DEV || false

  /**
   * Start measuring performance for a specific operation
   */
  start(name: string): void {
    if (!this.enabled) return

    this.metrics.set(name, {
      name,
      startTime: performance.now()
    })
  }

  /**
   * End measuring performance and log the result
   */
  end(name: string): number | null {
    if (!this.enabled) return null

    const metric = this.metrics.get(name)
    if (!metric) {
      console.warn(`⚠️ Performance metric "${name}" not found`)
      return null
    }

    const endTime = performance.now()
    const duration = endTime - metric.startTime

    metric.endTime = endTime
    metric.duration = duration

    // Log performance metric
    const color = duration < 100 ? '🟢' : duration < 500 ? '🟡' : '🔴'
    console.log(`${color} Performance: ${name} took ${duration.toFixed(2)}ms`)

    return duration
  }

  /**
   * Measure a function execution time
   */
  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn()

    this.start(name)
    const result = fn()
    this.end(name)
    return result
  }

  /**
   * Measure an async function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn()

    this.start(name)
    const result = await fn()
    this.end(name)
    return result
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number
    averageDuration: number
    slowestOperation: PerformanceMetric | null
    fastestOperation: PerformanceMetric | null
  } {
    const metrics = this.getMetrics().filter(m => m.duration !== undefined)
    
    if (metrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null
      }
    }

    const durations = metrics.map(m => m.duration!)
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0)
    const averageDuration = totalDuration / durations.length

    const slowestOperation = metrics.reduce((slowest, current) => 
      (current.duration! > slowest.duration!) ? current : slowest
    )

    const fastestOperation = metrics.reduce((fastest, current) => 
      (current.duration! < fastest.duration!) ? current : fastest
    )

    return {
      totalOperations: metrics.length,
      averageDuration,
      slowestOperation,
      fastestOperation
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

/**
 * React hook for measuring component render performance
 */
import { useEffect, useCallback } from 'react'

export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    performanceMonitor.start(`${componentName}_mount`)
    
    return () => {
      performanceMonitor.end(`${componentName}_mount`)
    }
  }, [componentName])

  const measureRender = useCallback((renderName: string = 'render') => {
    performanceMonitor.start(`${componentName}_${renderName}`)
    
    // End measurement on next tick
    setTimeout(() => {
      performanceMonitor.end(`${componentName}_${renderName}`)
    }, 0)
  }, [componentName])

  return { measureRender }
}

/**
 * Decorator for measuring function performance
 */
export function measurePerformance(name: string) {
  return function (_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(`${name}_${propertyKey}`, () => {
        return originalMethod.apply(this, args)
      })
    }

    return descriptor
  }
}

/**
 * Utility to measure Web Vitals
 */
export const measureWebVitals = () => {
  if (typeof window === 'undefined') return

  // Measure First Contentful Paint
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
        console.log(`🎨 First Contentful Paint: ${entry.startTime.toFixed(2)}ms`)
      }
      
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming
        console.log(`🚀 Page Load Time: ${navEntry.loadEventEnd - navEntry.fetchStart}ms`)
        console.log(`📡 DNS Lookup: ${navEntry.domainLookupEnd - navEntry.domainLookupStart}ms`)
        console.log(`🔗 Connection: ${navEntry.connectEnd - navEntry.connectStart}ms`)
        console.log(`📄 DOM Content Loaded: ${navEntry.domContentLoadedEventEnd - navEntry.fetchStart}ms`)
      }
    }
  })

  observer.observe({ entryTypes: ['paint', 'navigation'] })

  // Measure Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    console.log(`🖼️ Largest Contentful Paint: ${lastEntry.startTime.toFixed(2)}ms`)
  })

  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

  // Measure First Input Delay
  const fidObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const fidEntry = entry as any
      if (fidEntry.processingStart) {
        const fid = fidEntry.processingStart - entry.startTime
        console.log(`⚡ First Input Delay: ${fid.toFixed(2)}ms`)
      }
    }
  })

  fidObserver.observe({ entryTypes: ['first-input'] })
}

/**
 * Bundle size analyzer
 */
export const analyzeBundleSize = () => {
  if (typeof window === 'undefined') return

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  
  const jsResources = resources.filter(resource => 
    resource.name.includes('.js') && !resource.name.includes('node_modules')
  )

  const cssResources = resources.filter(resource => 
    resource.name.includes('.css')
  )

  const totalJSSize = jsResources.reduce((total, resource) => 
    total + (resource.transferSize || 0), 0
  )

  const totalCSSSize = cssResources.reduce((total, resource) => 
    total + (resource.transferSize || 0), 0
  )

  console.log('📦 Bundle Analysis:')
  console.log(`  JavaScript: ${(totalJSSize / 1024).toFixed(2)} KB`)
  console.log(`  CSS: ${(totalCSSSize / 1024).toFixed(2)} KB`)
  console.log(`  Total: ${((totalJSSize + totalCSSSize) / 1024).toFixed(2)} KB`)

  return {
    jsSize: totalJSSize,
    cssSize: totalCSSSize,
    totalSize: totalJSSize + totalCSSSize,
    jsResources,
    cssResources
  }
}