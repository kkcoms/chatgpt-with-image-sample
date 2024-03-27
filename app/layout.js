import '../assets/main.css'

import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
// Supports weights 200-900
import '@fontsource-variable/nunito';

export default function RootLayout({ children }) {
  return (
    <html lang='ja'>
      <body>{children}</body>
    </html>
  )
}