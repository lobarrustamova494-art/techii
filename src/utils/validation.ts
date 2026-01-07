export interface ValidationResult {
  isValid: boolean
  message?: string
}

export class FormValidator {
  /**
   * Telefon raqamni validatsiya qilish
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone) {
      return { isValid: false, message: 'Telefon raqam majburiy' }
    }

    // +998 formatini tekshirish
    const phoneRegex = /^\+998[0-9]{9}$/
    if (!phoneRegex.test(phone)) {
      return { isValid: false, message: 'Telefon raqam noto\'g\'ri formatda (+998XXXXXXXXX)' }
    }

    // Operator kodlarini tekshirish
    const operatorCode = phone.substring(4, 6)
    const validOperators = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77']
    
    if (!validOperators.includes(operatorCode)) {
      return { isValid: false, message: 'Noto\'g\'ri operator kodi' }
    }

    return { isValid: true }
  }

  /**
   * Parol kuchliligini tekshirish
   */
  static validatePassword(password: string): ValidationResult & { strength: 'weak' | 'medium' | 'strong' } {
    if (!password) {
      return { isValid: false, message: 'Parol majburiy', strength: 'weak' }
    }

    if (password.length < 6) {
      return { isValid: false, message: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak', strength: 'weak' }
    }

    let strength: 'weak' | 'medium' | 'strong' = 'weak'
    let score = 0

    // Uzunlik
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1

    // Katta harflar
    if (/[A-Z]/.test(password)) score += 1

    // Kichik harflar
    if (/[a-z]/.test(password)) score += 1

    // Raqamlar
    if (/[0-9]/.test(password)) score += 1

    // Maxsus belgilar
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score >= 4) strength = 'strong'
    else if (score >= 2) strength = 'medium'

    return { isValid: true, strength }
  }

  /**
   * Ismni validatsiya qilish
   */
  static validateName(name: string): ValidationResult {
    if (!name) {
      return { isValid: false, message: 'Ism majburiy' }
    }

    if (name.length < 2) {
      return { isValid: false, message: 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak' }
    }

    if (name.length > 50) {
      return { isValid: false, message: 'Ism 50 ta belgidan oshmasligi kerak' }
    }

    // Faqat harflar, bo'sh joy va ba'zi maxsus belgilar
    const nameRegex = /^[a-zA-ZА-Яа-яЁёўғқҳ\s\-\'\.]+$/
    if (!nameRegex.test(name)) {
      return { isValid: false, message: 'Ismda faqat harflar bo\'lishi mumkin' }
    }

    return { isValid: true }
  }

  /**
   * Parollarni solishtirish
   */
  static validatePasswordMatch(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword) {
      return { isValid: false, message: 'Parolni tasdiqlash majburiy' }
    }

    if (password !== confirmPassword) {
      return { isValid: false, message: 'Parollar mos kelmaydi' }
    }

    return { isValid: true }
  }

  /**
   * Telefon raqamni formatlash
   */
  static formatPhone(value: string): string {
    // Faqat raqamlarni qoldirish
    const numbers = value.replace(/\D/g, '')
    
    if (numbers.length === 0) return ''

    // Agar 998 bilan boshlanmasa, +998 qo'shish
    let formatted = ''
    if (numbers.startsWith('998')) {
      formatted = '+' + numbers
    } else if (numbers.startsWith('8')) {
      formatted = '+99' + numbers
    } else {
      formatted = '+998' + numbers
    }
    
    // Maksimal uzunlik: +998XXXXXXXXX (13 belgi)
    if (formatted.length > 13) {
      formatted = formatted.slice(0, 13)
    }

    return formatted
  }

  /**
   * Telefon raqamni display formatiga o'tkazish
   */
  static displayPhone(phone: string): string {
    if (!phone || phone.length < 13) return phone

    // +998901234567 -> +998 90 123 45 67
    return phone.replace(/(\+998)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')
  }
}