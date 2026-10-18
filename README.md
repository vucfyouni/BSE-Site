# Blank Slate Entertainment — GoDaddy upload package

Download ZIP: https://github.com/vucfyouni/BSE-Site/archive/refs/heads/godaddy.zip

Standalone HTML, CSS, JavaScript and local photographs, with a PHP team-application handler. No build step, account sign-in, application dashboard, database or Node server is required. The crew portal is removed. The homepage, team pages, local galleries, crowd backgrounds, quote calculator, inquiry email drafts and supplied Behold widgets are included.

## Required hosting

Use **GoDaddy Web Hosting with cPanel**, with PHP 8.1 or newer and the Fileinfo extension enabled. A currently supported PHP version is recommended. **Websites + Marketing Free is the website builder; it cannot accept this package as a complete uploaded website.** Upgrading that builder is a different purchase from obtaining ordinary file-upload hosting.

This branch contains the ready-to-upload website files at its root. Download the branch ZIP, extract it on your computer, then upload the **contents** of its `BSE-Site-godaddy` folder into the document root for blankslatelv.com. The primary domain usually uses `public_html`. Make sure `index.html`, `apply.php`, `assets/`, `.htaccess` and `.user.ini` are directly in the domain's root, rather than inside another nested folder. Include hidden files. Do not upload a Git repository, private applications, or the downloaded ZIP itself as website content. Remove the server-side ZIP after extracting it if you use File Manager to extract an archive.

Official upload instructions: https://www.godaddy.com/help/upload-files-using-my-web-hosting-cpanel-file-manager-3239

## Connect the domain and HTTPS

Add blankslatelv.com to the hosting account and use **the DNS targets supplied by that GoDaddy hosting account** for the root and www records. Leave nameservers and mail records unchanged unless GoDaddy explicitly requires another configuration. Enable HTTPS for both blankslatelv.com and www.blankslatelv.com before testing the application. This package redirects HTTP requests to https://blankslatelv.com using Apache rewrite support.

For existing Behold widgets, authorize blankslatelv.com and www.blankslatelv.com in any domain whitelist configured in your Behold dashboard. Their source authorization, display theme and playback settings remain managed there.

## Private application storage

The public application form requires an 18+ confirmation and a portfolio PDF, JPEG, PNG or WebP, up to 8 MB. It submits directly to `apply.php` without an account. The PHP service validates fields and file content, checks a session token and the allowed website origin, uses a hidden spam field, and limits successful uploads to five per connection per hour.

For a normal cPanel path such as `/home/YOUR_ACCOUNT/public_html`, it automatically creates `/home/YOUR_ACCOUNT/bse-private`. This directory is **outside public_html**, with private folders (0700) and files (0600). Each application is stored under `bse-private/applications/REFERENCE/`, containing `application.json` and `portfolio.pdf` (or its verified image extension).

Review submissions through the hosting account's File Manager by opening the account home directory, then `bse-private/applications`. Download the JSON and portfolio for review and contact the applicant using their supplied email. There are **no automatic email notifications**, public application-status pages or admin dashboard. Check this folder regularly and back it up privately; delete applications there when no longer needed. Never move `bse-private` inside the public website directory or into this repository.

If the document root is not below `public_html`, edit `application-config.php` and set `private_directory` to an absolute directory outside every publicly served document root. For example: `/home/YOUR_ACCOUNT/bse-private`. Its parent directory must already exist and be writable by PHP. The service refuses to store applications in the detected public document root and reports a temporary-unavailability message if private storage cannot be configured safely. For accounts hosting several domains, ensure the chosen private directory is not another domain's document root.

`.user.ini` requests a 10 MB PHP upload allowance and a 12 MB request allowance; the service still enforces an 8 MB portfolio limit. If GoDaddy overrides these values, change `upload_max_filesize` and `post_max_size` through the hosting PHP settings. The form displays an email fallback if the handler is unavailable. Hosting configuration changes may take a few minutes to apply.

## Verify after upload

1. Open the homepage, team profiles, image viewers and quote calculator on the real domain. Check images and navigation on mobile.
2. Submit a small genuine test portfolio with an 18+ confirmation. Confirm the receipt reference appears and that its files exist under the private folder through File Manager.
3. Confirm `/bse-private/` is inaccessible on the public website; uploads must never be served publicly. Remove the test application after checking.
4. Verify both Behold widgets show the expected posts after authorizing the new domains.

The PHP application flow was tested locally, including rejection of underage confirmations, invalid files, missing tokens, foreign origins, oversized files, repeat submissions and unsafe storage paths. It still needs the actual GoDaddy account's PHP, private-directory permissions, HTTPS and DNS configuration checked after upload. External provider content cannot be guaranteed by the package.

## Pricing and media

Starting estimate: sets × ($50 × total contractors + attendance charge). The attendance charge is $15 per started 100 expected attendees, or $40 per started 100 at venue capacity above 400. Capacity defaults to expected attendance if omitted. Photography bookings expecting more than 300 attendees add a minimum second photographer; video-only bookings do not. Editing, RAW delivery and audio recording remain quoted separately until rates are supplied. Inquiries open an email draft to blankslatelv@gmail.com; they do not send email automatically or confirm bookings.

Included galleries: Carlos 44 photos, Connor 18 and Skylar 14, plus five available headshots. Nick and Roland/Chloe portfolio assets, the shared Roland/Chloe headshot and Logan's clips were unavailable at the last import. Missing clip sections remain hidden. Local media is a snapshot; future Drive changes require another import. Font licensing and photographer credits remain included.
