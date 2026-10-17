# Blank Slate Entertainment

A responsive three-page website for Blank Slate Entertainment, built with plain HTML, CSS, and a local SVG favicon. No package installation, build step, credentials, or external assets are required.

## Run locally

From `/workspace/BSE-Site`:

```sh
python3 -m http.server 3000 --bind 0.0.0.0 --directory .
```

The server should report a successful GET for `/`, `/photog-portfolio.html`, `/pricing-and-booking.html`, `/styles.css`, and `/favicon.svg`. Stop it with Ctrl+C. This is a development server; publish the static files through a static website host for public use.

## Edit the website

- `index.html`: Mainpage, with the introduction and links to both dedicated pages.
- `photog-portfolio.html`: Photog Portfolio, with clearly labeled spaces for future photographs.
- `pricing-and-booking.html`: Pricing and Booking, with photo, video, and combined packages and email inquiry links.
- `styles.css`: layout, responsive styles, colors, and typography.
- `favicon.svg`: the brand symbol shown in browser tabs.

All three pages share navigation and styling. `index.html` remains the default homepage for static hosting; its navigation label is “Mainpage.” Page URLs use relative links so the site also works below a GitHub Pages repository path.

Pricing uses “Request a quote” until rates are provided. Package inquiry links open an email to `blankslatelv@gmail.com` with a relevant subject. The email link opens the visitor’s configured mail app; the website does not send email itself. The portfolio contains clearly labeled “Photos coming soon” placeholders, without stock or fabricated work. Replace the placeholder figures with your photographs, meaningful alt text, and accurate captions when available. Before launching, review the package descriptions and include any required legal notices. No contact form, mailing list, analytics, or customer data collection has been configured.

## Hosting

This site can be served directly by a static host, including GitHub Pages. Use the repository root as the publishing directory; there is no build output directory. Hosting and a custom domain have not been configured.

## Cloud environment

Use the existing `/workspace/BSE-Site` checkout. Each cloud task is already isolated; a separate Git worktree is unnecessary. No dependency installation is needed. Restart the development server in each new task, since running processes do not survive an environment snapshot.
