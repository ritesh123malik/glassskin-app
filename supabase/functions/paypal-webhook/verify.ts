export async function verifyPayPalWebhookSignature(
  req: Request,
  body: unknown,
  accessToken: string,
  baseUrl: string,
) {
  const transmissionId = req.headers.get('paypal-transmission-id')
  const transmissionTime = req.headers.get('paypal-transmission-time')
  const certUrl = req.headers.get('paypal-cert-url')
  const authAlgo = req.headers.get('paypal-auth-algo')
  const transmissionSig = req.headers.get('paypal-transmission-sig')
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID')

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
    return false
  }

  const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    }),
  })

  if (!res.ok) {
    return false
  }

  const verification = await res.json()
  return verification.verification_status === 'SUCCESS'
}
