$file = "C:\Users\mrnet\Documents\antigravity\adventurous-noether\fasal_setu\docs\index.html"
$html = Get-Content $file -Raw -Encoding UTF8

# 1. Add QR + receipt CSS before </style>
$newCss = @'
.qr-section{display:flex;flex-direction:column;align-items:center;margin:16px 0 12px}
.qr-img{width:180px;height:180px;border-radius:14px;border:3px solid var(--line);object-fit:cover}
.qr-label{font-size:12px;color:var(--muted);margin:8px 0 10px}
.upi-id-box{display:flex;align-items:center;gap:9px;background:#f1f7ed;border:1px solid #d0e6c8;border-radius:10px;padding:9px 13px;font-size:13px}
.copy-upi{border:1px solid var(--green);background:transparent;color:var(--green);border-radius:7px;padding:4px 10px;font-size:12px;font-weight:700}
.copy-upi.copied{background:var(--green);color:#fff}
.paid-btn{background:#1d6b4f}
.receipt-modal{display:none;position:fixed;inset:0;background:#17352d80;z-index:30;padding:20px;place-items:center}
.receipt-modal.open{display:grid}
.receipt-box{width:min(430px,100%);background:#fffdf8;border-radius:22px;padding:28px 24px;box-shadow:0 25px 60px #17352d44;text-align:center;max-height:calc(100vh - 40px);overflow:auto}
.receipt-check{width:62px;height:62px;border-radius:50%;background:#1d6b4f;color:#d7ef72;font-size:30px;display:grid;place-items:center;margin:0 auto 14px;animation:popIn .4s cubic-bezier(.175,.885,.32,1.275)}
@keyframes popIn{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
.receipt-box h2{font:700 26px Fraunces,serif;letter-spacing:-1px;margin:0 0 5px;color:var(--ink)}
.receipt-box>p{color:var(--muted);font-size:13px;margin:0 0 18px}
.receipt-card{background:#f5f9f3;border:1px solid #d6e8d1;border-radius:14px;padding:14px;text-align:left}
.receipt-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:7px 0;border-bottom:1px solid #e5edd9}
.receipt-row:last-child{border:0}
.receipt-row span{color:var(--muted)}
.receipt-row b{color:var(--ink)}
.receipt-amount{color:var(--green);font-size:16px}
.txn-id{font-family:monospace;font-size:11px;color:#555}
'@
$html = $html -replace '</style>', "$newCss</style>"

# 2. Replace the payment modal section
$oldModal = '<div class="payment-modal" id="paymentModal" role="dialog" aria-modal="true" aria-label="Complete pickup payment"><section class="payment-box"><div class="payment-top"><div><h2>Complete pickup payment</h2><p>Pay securely through FasalSetu.</p></div><button class="close-modal" id="closePayment" aria-label="Close">&times;</button></div><div class="payment-summary"><div class="pay-line"><span>Fixed FasalSetu platform fee</span><b>&#8377;200</b></div><div class="pay-line"><span>Distance charge &middot; 18 km (4 &times; &#8377;10)</span><b>&#8377;40</b></div><div class="pay-line pay-total"><span>Total payable</span><b>&#8377;240</b></div><p class="fee-note">&#8377;200 fixed fee + &#8377;10 for every 5 km (or part of 5 km). No hidden commission.</p></div><strong style="font-size:13px">Choose payment method</strong><div class="pay-methods"><button class="pay-method active" data-method="UPI">UPI</button><button class="pay-method" data-method="Card">Card</button><button class="pay-method" data-method="Bank transfer">Bank transfer</button></div><button class="join" id="confirmPayment" style="width:100%;margin:0">Pay &#8377;240 securely</button><button class="cancel-pay" id="cancelPayment">Cancel reservation</button><p class="secure">&#128274; Your payment is protected in the app.</p></section></div>'

$newModal = '<div class="payment-modal" id="paymentModal" role="dialog" aria-modal="true" aria-label="Complete pickup payment"><section class="payment-box"><div class="payment-top"><div><h2>Complete pickup payment</h2><p>Scan QR or pay via UPI · FasalSetu</p></div><button class="close-modal" id="closePayment" aria-label="Close">&times;</button></div><div class="payment-summary"><div class="pay-line"><span>Fixed FasalSetu platform fee</span><b>&#8377;200</b></div><div class="pay-line"><span>Distance charge &middot; 18 km (4 &times; &#8377;10)</span><b>&#8377;40</b></div><div class="pay-line pay-total"><span>Total payable</span><b>&#8377;240</b></div><p class="fee-note">&#8377;200 fixed fee + &#8377;10 per 5 km. No hidden charges.</p></div><div class="qr-section"><img src="./qr.jpg" alt="Scan to pay - Manveer Singh" class="qr-img"><p class="qr-label">Scan with GPay, PhonePe, Paytm or any UPI app</p><div class="upi-id-box"><span>UPI ID: <strong>mr.net445-4@oksbi</strong></span><button class="copy-upi" id="copyUpi">Copy</button></div></div><button class="join paid-btn" id="confirmPayment" style="width:100%;margin:0">&#10003; I&apos;ve Paid</button><button class="cancel-pay" id="cancelPayment">Cancel reservation</button><p class="secure">&#128274; Payments go directly to FasalSetu via UPI</p></section></div><div class="receipt-modal" id="receiptModal" role="dialog" aria-modal="true" aria-label="Payment receipt"><section class="receipt-box"><div class="receipt-check">&#10003;</div><h2>Payment Successful!</h2><p>Your pickup is confirmed. Safe travels to the mandi!</p><div class="receipt-card"><div class="receipt-row"><span>Farmer</span><b id="rFarmer">Ramesh Kumar</b></div><div class="receipt-row"><span>Amount Paid</span><b class="receipt-amount">&#8377;240</b></div><div class="receipt-row"><span>Paid to (UPI)</span><b>mr.net445-4@oksbi</b></div><div class="receipt-row"><span>Transaction ID</span><b class="txn-id" id="rTxn">FS---------</b></div><div class="receipt-row"><span>Date &amp; Time</span><b id="rDate">-</b></div><div class="receipt-row"><span>Crop &amp; Quantity</span><b id="rCrop">Wheat &middot; 4 qtl</b></div><div class="receipt-row"><span>Destination Mandi</span><b id="rMandi">Azadpur Mandi</b></div><div class="receipt-row"><span>Pickup Vehicle</span><b id="rVehicle">DL 1L 4728</b></div></div><button class="join" style="width:100%;margin:16px 0 8px" id="receiptDone">Back to Dashboard</button><p class="secure">&#128274; Keep this receipt for your records</p></section></div>'

# Try to find and replace the payment modal
if ($html.Contains('<div class="payment-modal"')) {
    # Find the payment modal block
    $startIdx = $html.IndexOf('<div class="payment-modal"')
    # Find closing </div> for the modal (after </section></div>)
    $searchFrom = $startIdx
    $endTag = '</section></div>'
    $endIdx = $html.IndexOf($endTag, $searchFrom) + $endTag.Length
    $oldBlock = $html.Substring($startIdx, $endIdx - $startIdx)
    $html = $html.Substring(0, $startIdx) + $newModal + $html.Substring($endIdx)
    Write-Host "Payment modal replaced successfully"
} else {
    Write-Host "ERROR: Could not find payment modal"
}

# 3. Update JS - replace confirmPayment click handler and add new ones
$oldConfirm = "document.getElementById('confirmPayment').addEventListener('click', () => { pendingPickup = false; paymentModal.classList.remove('open'); showJoinedState(); });"

$newConfirm = @"
document.getElementById('copyUpi').addEventListener('click', () => { navigator.clipboard.writeText('mr.net445-4@oksbi').then(() => { const b = document.getElementById('copyUpi'); b.textContent = 'Copied!'; b.classList.add('copied'); setTimeout(() => { b.textContent = 'Copy'; b.classList.remove('copied'); }, 2000); }); });
document.getElementById('confirmPayment').addEventListener('click', () => {
  pendingPickup = false; paymentModal.classList.remove('open');
  const farmer = signedInFarmer.name || 'Ramesh Kumar';
  const txn = 'FS' + Date.now().toString(36).toUpperCase().slice(-8);
  const now = new Date().toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
  document.getElementById('rFarmer').textContent = farmer;
  document.getElementById('rTxn').textContent = txn;
  document.getElementById('rDate').textContent = now;
  document.getElementById('rCrop').textContent = (selectedCrop.charAt(0).toUpperCase()+selectedCrop.slice(1)) + ' \u00b7 4 qtl';
  const bestMarket = liveMarkets[0];
  document.getElementById('rMandi').textContent = bestMarket ? bestMarket.name : 'Azadpur Mandi';
  document.getElementById('rVehicle').textContent = selectedTruck.vehicle || 'DL 1L 4728';
  document.getElementById('receiptModal').classList.add('open');
  showJoinedState();
});
document.getElementById('receiptDone').addEventListener('click', () => { document.getElementById('receiptModal').classList.remove('open'); });
document.getElementById('receiptModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });
"@

$html = $html -replace [regex]::Escape($oldConfirm), $newConfirm

Set-Content $file $html -Encoding UTF8
Write-Host "Done! index.html updated."
