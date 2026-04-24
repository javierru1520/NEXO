import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 30,
  ssl: {
    rejectUnauthorized: false,
  },
})

export default sql
