<?php
session_start();

function agRandCode($len = 5) {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I/L
    $s = '';
    for ($i = 0; $i < $len; $i++) {
        $s .= $chars[random_int(0, strlen($chars) - 1)];
    }
    return $s;
}

$code = agRandCode(5);
$_SESSION['captcha'] = $code;

$w = 132;
$h = 44;
$img = imagecreatetruecolor($w, $h);
$bg = imagecolorallocate($img, 245, 248, 252);
imagefilledrectangle($img, 0, 0, $w, $h, $bg);

// background noise lines
for ($i = 0; $i < 4; $i++) {
    $c = imagecolorallocate($img, rand(150, 210), rand(150, 210), rand(150, 210));
    imageline($img, rand(0, $w), rand(0, $h), rand(0, $w), rand(0, $h), $c);
}

// characters with random vertical jitter
$x = 12;
for ($i = 0; $i < strlen($code); $i++) {
    $color = imagecolorallocate($img, rand(20, 90), rand(40, 120), rand(80, 170));
    $y = rand(6, 16);
    imagestring($img, 5, $x, $y, $code[$i], $color);
    $x += 22;
}

// speckle noise
for ($i = 0; $i < 70; $i++) {
    $c = imagecolorallocate($img, rand(180, 230), rand(180, 230), rand(180, 230));
    imagesetpixel($img, rand(0, $w), rand(0, $h), $c);
}

header('Content-Type: image/png');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
imagepng($img);
imagedestroy($img);
