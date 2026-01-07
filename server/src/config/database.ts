import mongoose from 'mongoose'

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined')
    }

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }

    await mongoose.connect(mongoUri, options)
    
    console.log('✅ MongoDB ga muvaffaqiyatli ulanildi')
    
    // Connection events
    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB xatolik:', error)
    })

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB aloqasi uzildi')
    })

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB ga qayta ulanildi')
    })

  } catch (error) {
    console.error('❌ MongoDB ga ulanishda xatolik:', error)
    process.exit(1)
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect()
    console.log('✅ MongoDB aloqasi yopildi')
  } catch (error) {
    console.error('❌ MongoDB aloqasini yopishda xatolik:', error)
  }
}