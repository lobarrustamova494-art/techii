export interface ValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  suggestions: string[]
  correctedAnswers?: string[]
}

export interface CrossValidationResult {
  originalAnswers: string[]
  validatedAnswers: string[]
  changesApplied: Array<{
    question: number
    original: string
    corrected: string
    reason: string
  }>
  finalConfidence: number
}

export class OMRValidationService {
  /**
   * Validate OMR results using multiple validation techniques
   */
  static async validateOMRResults(
    extractedAnswers: string[],
    answerKey: string[],
    imageBase64: string
  ): Promise<ValidationResult> {
    console.log('=== OMR VALIDATION STARTED ===')
    
    const issues: string[] = []
    const suggestions: string[] = []
    let confidence = 1.0

    // 1. Length validation
    if (extractedAnswers.length !== answerKey.length) {
      issues.push(`Answer count mismatch: expected ${answerKey.length}, got ${extractedAnswers.length}`)
      confidence -= 0.2
    }

    // 2. Answer format validation
    const validAnswers = ['A', 'B', 'C', 'D', 'E', 'BLANK']
    extractedAnswers.forEach((answer, index) => {
      if (!validAnswers.includes(answer)) {
        issues.push(`Invalid answer at question ${index + 1}: ${answer}`)
        confidence -= 0.05
      }
    })

    // 3. Pattern analysis
    const patternIssues = this.analyzeAnswerPatterns(extractedAnswers)
    issues.push(...patternIssues.issues)
    confidence -= patternIssues.confidencePenalty

    // 4. Statistical validation
    const statsValidation = this.performStatisticalValidation(extractedAnswers, answerKey)
    if (!statsValidation.isValid) {
      issues.push(...statsValidation.issues)
      confidence -= 0.1
    }

    // 5. Generate suggestions
    if (issues.length > 0) {
      suggestions.push('Consider re-scanning with better lighting')
      suggestions.push('Ensure OMR sheet is properly aligned')
      suggestions.push('Check for multiple marks or erasures')
    }

    return {
      isValid: issues.length === 0,
      confidence: Math.max(0, confidence),
      issues,
      suggestions,
      correctedAnswers: extractedAnswers
    }
  }

  /**
   * Cross-validate results using multiple analysis methods
   */
  static async crossValidateResults(
    method1Results: string[],
    method2Results: string[],
    method3Results: string[],
    answerKey: string[]
  ): Promise<CrossValidationResult> {
    console.log('=== CROSS-VALIDATION STARTED ===')
    
    const validatedAnswers: string[] = []
    const changesApplied: Array<{
      question: number
      original: string
      corrected: string
      reason: string
    }> = []

    for (let i = 0; i < answerKey.length; i++) {
      const answers = [
        method1Results[i] || 'BLANK',
        method2Results[i] || 'BLANK', 
        method3Results[i] || 'BLANK'
      ]

      // Count occurrences
      const counts: { [key: string]: number } = {}
      answers.forEach(answer => {
        counts[answer] = (counts[answer] || 0) + 1
      })

      // Find consensus
      let bestAnswer = method1Results[i] || 'BLANK'
      let maxCount = 1
      let hasConsensus = false

      Object.entries(counts).forEach(([answer, count]) => {
        if (count > maxCount) {
          maxCount = count
          bestAnswer = answer
          hasConsensus = count >= 2
        }
      })

      // Apply correction if needed
      if (hasConsensus && bestAnswer !== method1Results[i]) {
        changesApplied.push({
          question: i + 1,
          original: method1Results[i] || 'BLANK',
          corrected: bestAnswer,
          reason: `Consensus from ${maxCount}/3 methods`
        })
      }

      validatedAnswers.push(bestAnswer)
    }

    // Calculate final confidence
    const agreementRatio = validatedAnswers.reduce((acc, answer, index) => {
      const methodAnswers = [method1Results[index], method2Results[index], method3Results[index]]
      const agreements = methodAnswers.filter(a => a === answer).length
      return acc + (agreements / 3)
    }, 0) / answerKey.length

    return {
      originalAnswers: method1Results,
      validatedAnswers,
      changesApplied,
      finalConfidence: agreementRatio
    }
  }

  /**
   * Analyze answer patterns for anomalies
   */
  private static analyzeAnswerPatterns(answers: string[]): {
    issues: string[]
    confidencePenalty: number
  } {
    const issues: string[] = []
    let penalty = 0

    // Check for suspicious patterns
    const answerCounts: { [key: string]: number } = {}
    answers.forEach(answer => {
      if (answer !== 'BLANK') {
        answerCounts[answer] = (answerCounts[answer] || 0) + 1
      }
    })

    // Check for extreme bias towards one answer
    const totalNonBlank = answers.filter(a => a !== 'BLANK').length
    Object.entries(answerCounts).forEach(([answer, count]) => {
      const percentage = count / totalNonBlank
      if (percentage > 0.6) {
        issues.push(`Suspicious bias towards answer ${answer} (${Math.round(percentage * 100)}%)`)
        penalty += 0.1
      }
    })

    // Check for too many blanks
    const blankCount = answers.filter(a => a === 'BLANK').length
    const blankPercentage = blankCount / answers.length
    if (blankPercentage > 0.3) {
      issues.push(`High number of blank answers (${Math.round(blankPercentage * 100)}%)`)
      penalty += 0.05
    }

    // Check for sequential patterns (like all A's in a row)
    let maxSequence = 1
    let currentSequence = 1
    for (let i = 1; i < answers.length; i++) {
      if (answers[i] === answers[i-1] && answers[i] !== 'BLANK') {
        currentSequence++
        maxSequence = Math.max(maxSequence, currentSequence)
      } else {
        currentSequence = 1
      }
    }

    if (maxSequence > 5) {
      issues.push(`Suspicious sequence of ${maxSequence} identical answers`)
      penalty += 0.05
    }

    return { issues, confidencePenalty: penalty }
  }

  /**
   * Perform statistical validation
   */
  private static performStatisticalValidation(
    extractedAnswers: string[],
    answerKey: string[]
  ): { isValid: boolean; issues: string[] } {
    const issues: string[] = []

    // Calculate expected vs actual distribution
    const expectedDistribution = this.calculateExpectedDistribution(answerKey)
    const actualDistribution = this.calculateActualDistribution(extractedAnswers)

    // Chi-square test for distribution similarity
    const chiSquare = this.calculateChiSquare(expectedDistribution, actualDistribution)
    const criticalValue = 9.488 // Chi-square critical value for 4 degrees of freedom at 95% confidence

    if (chiSquare > criticalValue) {
      issues.push(`Answer distribution significantly different from expected (χ² = ${chiSquare.toFixed(2)})`)
    }

    return {
      isValid: issues.length === 0,
      issues
    }
  }

  private static calculateExpectedDistribution(answerKey: string[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    answerKey.forEach(answer => {
      if (answer && typeof answer === 'string' && distribution.hasOwnProperty(answer)) {
        distribution[answer] = (distribution[answer] || 0) + 1
      }
    })
    return distribution
  }

  private static calculateActualDistribution(answers: string[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0, E: 0 }
    answers.forEach(answer => {
      if (answer && typeof answer === 'string' && distribution.hasOwnProperty(answer)) {
        distribution[answer] = (distribution[answer] || 0) + 1
      }
    })
    return distribution
  }

  private static calculateChiSquare(
    expected: { [key: string]: number },
    actual: { [key: string]: number }
  ): number {
    let chiSquare = 0
    Object.keys(expected).forEach(key => {
      const exp = expected[key] || 0.1 // Avoid division by zero
      const act = actual[key] || 0
      chiSquare += Math.pow(act - exp, 2) / exp
    })
    return chiSquare
  }

  /**
   * Real-time confidence monitoring
   */
  static monitorConfidence(
    currentConfidence: number,
    threshold: number = 0.95
  ): {
    needsReanalysis: boolean
    recommendations: string[]
  } {
    const recommendations: string[] = []
    
    if (currentConfidence < threshold) {
      recommendations.push('Consider using multiple analysis methods')
      recommendations.push('Verify image quality and lighting')
      recommendations.push('Check for proper bubble filling')
      
      if (currentConfidence < 0.8) {
        recommendations.push('Manual verification recommended')
        recommendations.push('Consider re-scanning the document')
      }
    }

    return {
      needsReanalysis: currentConfidence < 0.9,
      recommendations
    }
  }
}