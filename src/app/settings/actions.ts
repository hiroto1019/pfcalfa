'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteUser() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'User not found' }
  }

  const { error } = await supabase.auth.admin.deleteUser(user.id)

  if (error) {
    console.error('Error deleting user:', error)
    return { error: 'Error deleting user' }
  }

  revalidatePath('/')
  redirect('/login')
} 