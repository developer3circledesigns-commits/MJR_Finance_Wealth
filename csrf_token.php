<?php
/**
 * Issues a CSRF token for the contact form. The token is stored in the
 * visitor's PHP session and must be echoed back in the form submission.
 * Same-origin only — cross-site scripts cannot read this value (CORS).
 */
session_start();
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

echo json_encode(array('token' => $_SESSION['csrf_token']));
