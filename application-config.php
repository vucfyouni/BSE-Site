<?php
declare(strict_types=1);
return [
    'allowed_origins' => ['https://blankslatelv.com', 'https://www.blankslatelv.com'],
    // Blank uses /home/YOUR_ACCOUNT/bse-private for a site under public_html.
    // Otherwise enter an absolute private directory outside all web roots.
    'private_directory' => '',
    'max_applications_per_ip_per_hour' => 5,
];
