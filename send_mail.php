<?php
/**
 * MJR Fin Wealth Finance — Contact form -> Gmail SMTP endpoint
 *
 * Receives JSON/Form POST from the contact form (id="contact-form") and sends
 * the enquiry to the configured Gmail inbox via smtp.gmail.com (STARTTLS).
 * A confirmation email is also sent to the visitor (auto-reply).
 *
 * Front-end contract: returns JSON  { "ok": bool, "msg": string }
 *
 * No external dependencies — uses PHP's built-in fsockopen + OpenSSL.
 */

session_start();

date_default_timezone_set('Asia/Kolkata'); // Chennai, India (IST, +05:30)

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

/* ----------------------------- CONFIG ----------------------------- */
$configFile = __DIR__ . '/mail_config.php';
if (!is_file($configFile)) {
    secureLog('config', 'mail_config.php missing');
    respond(false, 'The mail service is temporarily unavailable. Please try again later.');
}
$cfg = require $configFile;

if (!extension_loaded('openssl')) {
    secureLog('config', 'openssl extension missing');
    respond(false, 'The mail service is temporarily unavailable. Please try again later.');
}
if (($cfg['password'] ?? '') === 'APP_PASSWORD_HERE' || ($cfg['password'] ?? '') === '') {
    secureLog('config', 'Gmail App Password not set');
    respond(false, 'The mail service is temporarily unavailable. Please try again later.');
}
/* ------------------------------------------------------------------ */

function respond($ok, $msg) {
    echo json_encode(array('ok' => (bool) $ok, 'msg' => $msg));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Invalid request method.');
}

/* ---- gather + sanitize ---- */
$name    = trim(strip_tags($_POST['name']    ?? ''));
$phone   = trim(strip_tags($_POST['phone']   ?? ''));
$email   = trim(strip_tags($_POST['email']   ?? ''));
$subject = trim(strip_tags($_POST['subject'] ?? 'General Inquiry'));
$message = trim(strip_tags($_POST['message'] ?? ''));

/* ---- anti-abuse: honeypot must stay empty ---- */
if (!empty($_POST['ag_check'] ?? '')) {
    secureLog('honeypot', 'bot submission blocked');
    respond(false, 'Submission blocked (spam check). Please contact us directly if this persists.');
}

/* ---- anti-abuse: CSRF token ---- */
if (empty($_POST['csrf_token']) || empty($_SESSION['csrf_token']) ||
    !hash_equals((string) $_SESSION['csrf_token'], (string) $_POST['csrf_token'])) {
    secureLog('csrf', 'invalid or missing CSRF token');
    respond(false, 'Session check failed. Please refresh this page and try again.');
}

/* ---- anti-abuse: image CAPTCHA ---- */
if (empty($_POST['captcha']) || empty($_SESSION['captcha']) ||
    !hash_equals((string) strtoupper($_SESSION['captcha']), (string) strtoupper(trim($_POST['captcha'])))) {
    secureLog('captcha', 'invalid or missing captcha');
    respond(false, 'The captcha code was incorrect. Please try again.');
}
unset($_SESSION['captcha']); // single-use: invalidate so it cannot be reused

/* ---- server-side validation (mirrors front-end) ---- */
if (mb_strlen($name) < 2)                           respond(false, 'Please enter your full name.');
if (!preg_match('/^[0-9+()\-\s]{7,20}$/', $phone)) respond(false, 'Please enter a valid phone number.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))     respond(false, 'Please enter a valid email address.');

/* ---- sanitize header fields: strip CR/LF & control chars (prevent header/CRLF injection) ---- */
$name    = mb_substr(cleanHeader($name), 0, 100);
$email   = mb_substr(cleanHeader($email), 0, 254);
$subject = mb_substr(cleanHeader($subject), 0, 200);
$message = mb_substr($message, 0, 5000);
$phone   = mb_substr($phone, 0, 30);

/* ---- anti-abuse: rate limiting (per IP and per email address) ---- */
$clientIp = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
if (!rateLimit('ip:' . $clientIp, 5, 600)) {
    secureLog('ratelimit_ip', $clientIp);
    respond(false, 'Too many requests. Please wait a few minutes and try again.');
}
if (!rateLimit('email:' . $email, 3, 3600)) {
    secureLog('ratelimit_email', md5($email));
    respond(false, 'This email address has been used too many times. Please try again later.');
}

/* ---- logo (embedded as inline CID so it renders reliably in all mail clients) ---- */
$logoFile   = __DIR__ . '/images/email_logo.png';
$logoCid    = 'mjrlogo' . md5('mjrfin-logo') . '@mjrfin';
$logoInline = null;
$logoSrc    = 'https://mjrfinwealth.com/images/logo.png'; // fallback if local file missing
if (is_file($logoFile)) {
    $logoInline = array('cid' => $logoCid, 'type' => 'image/png', 'data' => file_get_contents($logoFile));
    $logoSrc    = 'cid:' . $logoCid;
}

/* ---- build notification mail (to site owner) — Layout 2: Left Accent Card ---- */
$ownerText  = "New enquiry from the MJR Fin Wealth Finance website\n"
            . "---------------------------------------\n"
            . "Name   : $name\n"
            . "Phone  : $phone\n"
            . "Email  : $email\n"
            . "Service: $subject\n"
            . "Date   : " . date('Y-m-d H:i:s') . " IST\n\n"
            . "Message:\n$message\n";

$ownerSubject = 'New Enquiry from ' . $name . ' (' . $subject . ')';
$ownerHtml    = buildLayout2('receiver', $name, $email, $phone, $subject, $message, $logoSrc);

/* ---- build auto-reply mail (to visitor) — Layout 2: Left Accent Card ---- */
$autoText = "Hello $name,\n\n"
          . "Thank you for contacting MJR Fin Wealth Finance. We have received your enquiry and one of our advisors will get back to you soon.\n\n"
          . "Your message:\n\"$message\"\n\n"
          . "Warm regards,\nJayachandran Mahadevan\nMJR Fin Wealth Finance\n+91 96001 28287 | +91 86670 51251\nARN: 292318\nPartner RM: +91 90806 58353\n\n"
          . "Tip: if this confirmation landed in your Spam or Junk folder, just mark it as 'Not spam' so our future replies reach your inbox.";

$autoHtml = buildLayout2('sender', $name, $email, $phone, $subject, $message, $logoSrc);

/* ---- send via Gmail SMTP ---- */
$smtp = new GmailSmtp($cfg['host'], $cfg['port'], $cfg['security']);

try {
    $smtp->connect();
    $smtp->auth($cfg['username'], $cfg['password']);

    $fromAddr = $cfg['from_email'];
    $fromName = $cfg['from_name'];

    $okOwner = $smtp->send(
        $fromName, $fromAddr,
        $cfg['to_name'], $cfg['to_email'],
        buildMessage(
            $name, $fromAddr,              // From DISPLAY = visitor (address stays the Gmail account)
            $cfg['to_name'], $cfg['to_email'],
            $email, $name,                 // Reply-To -> the visitor
                $ownerSubject, $ownerText, $ownerHtml, array($logoInline)
            )
        );

    $okAuto = true;
    if (!empty($cfg['autoreply']) && domainAcceptsMail($email)) {
        // Auto-reply is best-effort: a mistyped/undeliverable visitor address must
        // NEVER fail the submission or throw — the owner notification is what matters.
        try {
            $okAuto = $smtp->send(
                $fromName, $fromAddr,
                $name, $email,
                buildMessage(
                    $fromName, $fromAddr,
                    $name, $email,
                    $fromAddr, $fromName,         // Reply-To -> the business
                    'We received your message — MJR Fin Wealth Finance',
                    $autoText, $autoHtml, array($logoInline),
                    "Auto-Submitted: auto-reply\r\n"
                )
            );
        } catch (Exception $e) {
            $okAuto = false; // swallowed on purpose
        }
    }

    $smtp->quit();
} catch (Exception $e) {
    secureLog('mail_error', $e->getMessage());
    respond(false, 'Something went wrong while sending your message. Please try again later.');
}

if ($okOwner) {
    respond(true, 'Thank you! Your message has been sent successfully. We will contact you soon.');
}
respond(false, 'Mail could not be sent. Please try again later.');

/* ============================ helpers ============================ */

/**
 * Strip CR/LF/NUL and other control characters so untrusted values can never
 * inject extra SMTP/MIME headers (CRLF / header injection).
 */
function cleanHeader($s) {
    $s = (string) $s;
    $s = preg_replace('/[\x00-\x1F\x7F]/', '', $s);
    return trim($s);
}

/**
 * Secure, minimal logging — metadata only. Never writes credentials or
 * full message bodies. Stored OUTSIDE the web root (system temp dir).
 */
function secureLog($type, $detail) {
    $dir = sys_get_temp_dir() . '/mjrfinwealth';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/mail_errors.log';
    $entry = date('c') . " [$type] " . $detail . "\n";
    @file_put_contents($file, $entry, FILE_APPEND | LOCK_EX);
}

/**
 * Simple file-based sliding-window rate limiter.
 * Allows up to $max hits per $windowSec for the given key.
 */
function rateLimit($key, $max, $windowSec) {
    $dir = sys_get_temp_dir() . '/mjrfinwealth_rl';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $file = $dir . '/' . md5($key) . '.json';
    $now  = time();
    $hits = is_file($file) ? (json_decode(@file_get_contents($file), true) ?: array()) : array();
    $hits = array_filter($hits, function ($t) use ($now, $windowSec) { return $t > $now - $windowSec; });
    if (count($hits) >= $max) return false;
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    return true;
}

function row($label, $value) {
    return "<tr><td style='padding:6px 10px;font-weight:700;color:#0E4DA4;width:120px;vertical-align:top'>"
         . htmlspecialchars($label) . "</td><td style='padding:6px 10px'>" . $value . "</td></tr>";
}

/* ---- Layout 2: Left Accent Card ---- */
function emailRow($label, $value) {
    return "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin:0 0 8px;border-bottom:1px solid #eef2f9;\">"
         . "<tr><td width=\"130\" valign=\"top\" style=\"font-size:13px;color:#5a6b82;font-weight:600;padding:7px 0;\">" . htmlspecialchars($label) . "</td>"
         . "<td valign=\"top\" style=\"font-size:14px;color:#0b1b33;padding:7px 0;\">" . $value . "</td></tr></table>";
}

function emailButton($href, $label, $bg, $fg) {
    return "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" style=\"margin-top:18px;\"><tr><td style=\"background:$bg;border-radius:0;\">"
         . "<a href=\"$href\" style=\"display:inline-block;padding:13px 26px;font-size:15px;font-weight:700;color:$fg;text-decoration:none;font-family:Segoe UI,Arial,sans-serif;\">" . htmlspecialchars($label) . "</a></td></tr></table>";
}

function buildLayout2($role, $name, $email, $phone, $service, $message, $logo) {
    $footer = 'Jayachandran Mahadevan &nbsp;·&nbsp; +91 96001 28287 &nbsp;·&nbsp; +91 86670 51251 &nbsp;·&nbsp; ARN: 292318 &nbsp;·&nbsp; Chennai, India';

    if ($role === 'receiver') {
        $eyebrow  = 'New Enquiry';
        $title    = 'New Enquiry Received';
        $lead     = 'You have a new enquiry from <strong>' . htmlspecialchars($name) . '</strong> via the MJR Fin Wealth Finance website.';
        $detTitle = 'Enquiry Details';
        $rows     = emailRow('Name',    htmlspecialchars($name))
                  . emailRow('Phone',   htmlspecialchars($phone))
                  . emailRow('Email',   '<a href="mailto:' . htmlspecialchars($email) . '" style="color:#0E4DA4;text-decoration:none;">' . htmlspecialchars($email) . '</a>')
                  . emailRow('Service', htmlspecialchars($service))
                  . emailRow('Date',    date('d M Y, h:i A') . ' IST')
                  . emailRow('Message', nl2br(htmlspecialchars($message)));
        $cta      = emailButton('mailto:' . $email . '?subject=' . rawurlencode('Re: ' . $service), 'Reply to ' . $name, '#0E4DA4', '#ffffff');
        $note     = 'This is an automated notification from the MJR Fin Wealth Finance contact form.';
    } else {
        $eyebrow  = 'MJR Fin Wealth Finance';
        $title    = 'Thank you, ' . htmlspecialchars($name) . '!';
        $lead     = "We've received your enquiry and one of our advisors will reach out <strong>soon</strong>.";
        $detTitle = 'Your Message';
        $rows     = emailRow('Service', htmlspecialchars($service))
                  . emailRow('Email',   htmlspecialchars($email))
                  . emailRow('Phone',   htmlspecialchars($phone))
                  . emailRow('Date',    date('d M Y, h:i A') . ' IST')
                  . emailRow('Message', nl2br(htmlspecialchars($message)));
        $cta      = emailButton('tel:+919600128287', 'Call +91 96001 28287', '#57A635', '#ffffff');
        $note     = 'You are receiving this because you contacted MJR Fin Wealth Finance. Simply reply to this email if you have more details.';
    }

    return <<<HTML
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4fb;padding:28px 0;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-left:6px solid #57A635;">
    <tr><td class="pad" style="padding:30px 36px 10px;">
      <img src="$logo" width="130" alt="MJR Fin Wealth Finance" style="display:block;width:130px;height:auto;">
    </td></tr>
    <tr><td class="pad" style="padding:6px 36px 34px;">
      <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#0E4DA4;font-weight:700;">$eyebrow</div>
      <h1 style="margin:8px 0 12px;font-size:23px;color:#0b1b33;font-family:Segoe UI,Arial,sans-serif;">$title</h1>
      <p style="margin:0 0 18px;font-size:15px;color:#3a4a63;line-height:1.6;font-family:Segoe UI,Arial,sans-serif;">$lead</p>
      <div style="padding:18px 20px;background:#f5f8ff;border:1px solid #e3ebf8;border-radius:0;">
        <div style="font-weight:700;color:#0E4DA4;margin-bottom:8px;font-family:Segoe UI,Arial,sans-serif;">$detTitle</div>
        $rows
      </div>
      $cta
      <p style="font-size:12px;color:#5a6b82;margin:18px 0 0;font-family:Segoe UI,Arial,sans-serif;">$note</p>
    </td></tr>
    <tr><td style="background:#0A2F63;color:#cdd8ea;padding:18px 36px;font-size:13px;text-align:center;font-family:Segoe UI,Arial,sans-serif;">$footer</td></tr>
  </table>
</td></tr>
</table>
HTML;
}

/**
 * Build an RFC 2045 / 2046 compliant message.
 * With $inline attachments it uses multipart/related so embedded (CID) images render.
 * @param array $inline  list of ['cid'=>, 'type'=>, 'data'=>binary]
 */
function buildMessage($fromName, $fromAddr, $toName, $toAddr, $replyAddr, $replyName, $subject, $text, $html, $inline = array(), $extraHeaders = '') {
    $uid = md5(uniqid(time()));
    $boundary = 'AG_' . $uid;

    $headers  = "From: " . encodeHeader($fromName) . " <$fromAddr>\r\n";
    $headers .= "To: " . encodeHeader($toName) . " <$toAddr>\r\n";
    $headers .= "Reply-To: " . encodeHeader($replyName) . " <$replyAddr>\r\n";
    $headers .= "Subject: " . encodeHeader($subject) . "\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    if ($extraHeaders !== '') {
        $headers .= $extraHeaders;
    }

    if (empty($inline)) {
        $headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
        $body = altBody($boundary, $text, $html) . "--$boundary--\r\n";
    } else {
        $rel = 'REL_' . $uid;
        $headers .= "Content-Type: multipart/related; boundary=\"$rel\"\r\n";
        $body  = "--$rel\r\n";
        $body .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n\r\n";
        $body .= altBody($boundary, $text, $html);
        $body .= "--$boundary--\r\n";
        foreach ($inline as $att) {
            $body .= "\r\n--$rel\r\n";
            $body .= "Content-Type: " . $att['type'] . "; name=\"logo.png\"\r\n";
            $body .= "Content-Transfer-Encoding: base64\r\n";
            $body .= "Content-ID: <" . $att['cid'] . ">\r\n";
            $body .= "Content-Disposition: inline; filename=\"logo.png\"\r\n\r\n";
            $body .= chunk_split(base64_encode($att['data']), 76, "\r\n");
        }
        $body .= "\r\n--$rel--\r\n";
    }

    return $headers . "\r\n" . $body;
}

function altBody($boundary, $text, $html) {
    $b  = "--$boundary\r\n";
    $b .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $b .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $b .= $text . "\r\n\r\n";
    $b .= "--$boundary\r\n";
    $b .= "Content-Type: text/html; charset=UTF-8\r\n";
    $b .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $b .= $html . "\r\n\r\n";
    return $b;
}

function encodeHeader($str) {
    if (preg_match('/[^\x20-\x7E]/', $str)) {
        return '=?UTF-8?B?' . base64_encode($str) . '?=';
    }
    return $str;
}

/**
 * Best-effort check that an email domain can actually receive mail.
 * Prevents auto-reply bounces (e.g. typo'd or reserved domains like example.com).
 * Returns false if no MX/A/AAAA record is found.
 */
function domainAcceptsMail($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) return false;
    $domain = substr($email, strrpos($email, '@') + 1);
    if (function_exists('checkdnsrr')) {
        if (checkdnsrr($domain, 'MX')) return true;
        if (checkdnsrr($domain, 'A') || checkdnsrr($domain, 'AAAA')) return true;
    }
    return false;
}

/**
 * Minimal, dependency-free Gmail SMTP client (STARTTLS / SSL, AUTH LOGIN).
 */
class GmailSmtp {
    private $host;
    private $port;
    private $security;
    private $sock;
    private $debug = false;

    public function __construct($host, $port, $security = 'tls') {
        $this->host = $host;
        $this->port = (int) $port;
        $this->security = $security === 'ssl' ? 'ssl' : 'tls';
    }

    private function log($m) { if ($this->debug) error_log('[SMTP] ' . $m); }

    /** Read one SMTP reply (handles multi-line 250-responses). */
    private function read() {
        $data = '';
        while (($line = fgets($this->sock, 515)) !== false) {
            $data .= $line;
            // Reply code followed by space = last line of this reply.
            if (isset($line[3]) && $line[3] === ' ') break;
        }
        $this->log('S: ' . str_replace("\r", '', $data));
        return $data;
    }

    private function write($cmd) {
        $this->log('C: ' . $cmd);
        fputs($this->sock, $cmd . "\r\n");
        return $this->read();
    }

    private function code($reply) {
        return (int) substr($reply, 0, 3);
    }

    public function connect() {
        $transport = $this->security === 'ssl' ? 'ssl://' : '';
        $this->sock = @fsockopen($transport . $this->host, $this->port, $errno, $errstr, 15);
        if (!$this->sock) {
            throw new Exception('Connection failed: ' . $errstr);
        }
        stream_set_timeout($this->sock, 30);
        $this->read(); // banner

        // For SSL the channel is already encrypted; only STARTTLS for TLS.
        if ($this->security === 'tls') {
            $r = $this->write('EHLO ' . gethostname());
            if ($this->code($r) !== 250) {
                // Fall back to HELO if EHLO unsupported
                $r = $this->write('HELO ' . gethostname());
            }
            $r = $this->write('STARTTLS');
            if ($this->code($r) !== 220) {
                throw new Exception('STARTTLS not supported by server.');
            }
            if (!stream_socket_enable_crypto($this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new Exception('TLS handshake failed.');
            }
        }

        $r = $this->write('EHLO ' . gethostname());
        if ($this->code($r) !== 250) {
            $r = $this->write('HELO ' . gethostname());
            if ($this->code($r) !== 250) {
                throw new Exception('EHLO/HELO failed.');
            }
        }
        return true;
    }

    public function auth($user, $pass) {
        $r = $this->write('AUTH LOGIN');
        if ($this->code($r) !== 334) {
            throw new Exception('SMTP auth not accepted.');
        }
        $r = $this->write(base64_encode($user));
        if ($this->code($r) !== 334) {
            throw new Exception('Username rejected by SMTP server.');
        }
        $r = $this->write(base64_encode($pass));
        if ($this->code($r) !== 235) {
            throw new Exception('Authentication failed — check your Gmail App Password.');
        }
        return true;
    }

    /**
     * Send a fully-formed message.
     * @param string $fromName  display name of envelope sender (unused by Gmail, kept for clarity)
     * @param string $fromAddr  envelope sender (must equal authenticated user)
     * @param string $toName    display name of recipient
     * @param string $toAddr    recipient address
     * @param string $rawMessage full message incl. headers built by buildMessage()
     */
    public function send($fromName, $fromAddr, $toName, $toAddr, $rawMessage) {
        $this->write('MAIL FROM:<' . $fromAddr . '>');
        $r = $this->write('RCPT TO:<' . $toAddr . '>');
        if ($this->code($r) !== 250) {
            throw new Exception('Recipient rejected: ' . trim($r));
        }
        $r = $this->write('DATA');
        if ($this->code($r) !== 354) {
            throw new Exception('DATA command failed.');
        }
        // SMTP transparency: a line beginning with a dot must be doubled.
        $rawMessage = preg_replace('/^\./m', '..', $rawMessage);
        fputs($this->sock, $rawMessage . "\r\n.\r\n");
        $r = $this->read();
        return $this->code($r) === 250;
    }

    public function quit() {
        if ($this->sock) {
            $this->write('QUIT');
            fclose($this->sock);
            $this->sock = null;
        }
    }
}
