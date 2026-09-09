<?php
/**
 * MJR Fin Wealth Finance — Gmail SMTP configuration (SAMPLE / TEMPLATE)
 *
 * This file is safe to commit. Copy it to `mail_config.php` on the server
 * and fill in the real App Password — `mail_config.php` is git-ignored.
 *
 * HOW TO USE:
 *  1. Create (or use) a dedicated Gmail account, e.g. investalphagrow@gmail.com
 *  2. Turn ON 2-Step Verification: https://myaccount.google.com/security
 *  3. Generate a 16-character App Password: https://myaccount.google.com/apppasswords
 *  4. Paste that App Password (no spaces) into 'password' below.
 *
 * IMPORTANT:
 *  - Never use your normal Gmail password. Gmail blocks basic-auth logins;
 *    you MUST use an App Password.
 *  - 'username' is the Gmail address that AUTHENTICATES and SENDS.
 */

return array(
    // ---- Gmail SMTP server ----
    'host'     => 'smtp.gmail.com',
    'port'     => 587,                 // 587 = STARTTLS (recommended). 465 = SSL.
    'security' => 'tls',               // 'tls' (STARTTLS, port 587) or 'ssl' (port 465)

    // ---- Authenticated sender (the Gmail account) ----
    'username' => 'investalphagrow@gmail.com',
    'password' => 'YOUR_GMAIL_APP_PASSWORD_HERE', // 16-char Gmail App Password (no spaces)
    'from_name'  => 'MJR Fin Wealth Finance',
    'from_email' => 'investalphagrow@gmail.com',

    // ---- Where enquiry notifications are delivered ----
    'to_name'  => 'MJR Fin Wealth Finance',
    'to_email' => 'investalphagrow@gmail.com',

    // ---- Send a confirmation copy to the visitor? ----
    'autoreply' => true,
);
