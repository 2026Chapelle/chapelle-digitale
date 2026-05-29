import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      montant,
      devise = 'eur',
      type = 'don',
      frequence = 'unique',
      user_nom,
      user_email,
      message,
      anonyme = false,
      campagne_id,
    } = body

    if (!montant || montant < 1) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Montant invalide (minimum 1€)' },
        { status: 400 }
      )
    }

    if (!user_email) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Email requis' },
        { status: 400 }
      )
    }

    const montantCentimes = Math.round(montant * 100)

    let paymentResult

    if (frequence === 'unique') {
      // One-time payment intent
      paymentResult = await stripe.paymentIntents.create({
        amount: montantCentimes,
        currency: devise,
        metadata: {
          type,
          campagne_id: campagne_id || '',
          user_email,
          user_nom: anonyme ? 'Anonyme' : user_nom,
        },
        receipt_email: user_email,
        description: `${type.toUpperCase()} — La Chapelle Internationale des Élus du Royaume`,
      })
    } else {
      // Recurring subscription
      const customer = await stripe.customers.create({
        email: user_email,
        name: anonyme ? 'Anonyme' : user_nom,
        metadata: { type },
      })

      const priceInterval: Record<string, Stripe.Price.Recurring.Interval> = {
        mensuel: 'month',
        trimestriel: 'month',
        annuel: 'year',
      }

      const price = await stripe.prices.create({
        unit_amount: montantCentimes,
        currency: devise,
        recurring: { interval: priceInterval[frequence] || 'month' },
        product_data: { name: `Don récurrent CIER — ${type}` },
      })

      paymentResult = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })
    }

    // Record in DB (pending)
    const { data: don, error } = await supabaseAdmin
      .from('dons')
      .insert({
        user_nom: anonyme ? 'Anonyme' : user_nom,
        user_email,
        montant,
        devise: devise.toUpperCase(),
        type,
        frequence,
        statut: 'en_attente',
        message,
        anonyme,
        campagne_id,
        methode_paiement: 'stripe',
        stripe_payment_intent_id: frequence === 'unique'
          ? (paymentResult as Stripe.PaymentIntent).id
          : undefined,
        stripe_subscription_id: frequence !== 'unique'
          ? (paymentResult as Stripe.Subscription).id
          : undefined,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        don_id: don.id,
        client_secret: frequence === 'unique'
          ? (paymentResult as Stripe.PaymentIntent).client_secret
          : ((paymentResult as Stripe.Subscription).latest_invoice as Stripe.Invoice)
            .payment_intent
            ? ((paymentResult as Stripe.Subscription).latest_invoice as Stripe.Invoice & {
                payment_intent: Stripe.PaymentIntent
              }).payment_intent.client_secret
            : null,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Don error:', error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erreur lors du traitement du don' },
      { status: 500 }
    )
  }
}

// Stripe webhook handler
export async function PUT(request: NextRequest) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalide' }, { status: 400 })
  }

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabaseAdmin
        .from('dons')
        .update({ statut: 'complete' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent
      await supabaseAdmin
        .from('dons')
        .update({ statut: 'echoue' })
        .eq('stripe_payment_intent_id', pi.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
