import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Mantine
import { MantineProvider } from '@mantine/core'
import type { MantineThemeOverride } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css'

const theme: MantineThemeOverride = {
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  components: {
    Paper: { defaultProps: { shadow: 'sm' } },
    Button: { defaultProps: { variant: 'filled' } },
  },
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <Notifications />
      <App />
    </MantineProvider>
  </React.StrictMode>,
);