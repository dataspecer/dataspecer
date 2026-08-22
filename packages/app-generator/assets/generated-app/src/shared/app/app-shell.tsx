import { useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useColorScheme, useTheme } from '@mui/material/styles';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import { createBrowserRouter, Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import type { RouteDescriptor } from './route-descriptor.ts';

const NAVIGATION_WIDTH = 260;

/** Creates the application router and shared page layout. */
export function createAppRouter(routes: readonly RouteDescriptor[], appName: string) {
  // list pages are application entry points, sort them by their displayed title
  const listRoutes = routes
    .filter((route) => route.operation === 'ReadList')
    .sort((left, right) => left.title.localeCompare(right.title));

  return createBrowserRouter([
    {
      path: '/',
      element: <AppLayout appName={appName} listRoutes={listRoutes} />,
      HydrateFallback: PageLoading,
      children: [
        // open the first list at the application root
        ...(listRoutes.length > 0
          ? [{ index: true, element: <Navigate to={listRoutes[0].path} replace /> }]
          : []),
        ...routes.map((route) => ({
          path: route.path,
          lazy: route.lazy,
        })),
        { path: '*', element: <NotFound /> },
      ],
    },
  ]);
}

interface AppLayoutProps {
  appName: string;
  listRoutes: readonly RouteDescriptor[];
}

function AppLayout(props: AppLayoutProps) {
  const theme = useTheme();
  const permanentNavigation = useMediaQuery(theme.breakpoints.up('md'));
  const [navigationOpen, setNavigationOpen] = useState(false);

  // close the temporary drawer when navigation switches to the permanent desktop layout
  useEffect(() => {
    if (permanentNavigation) {
      setNavigationOpen(false);
    }
  }, [permanentNavigation]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          zIndex: (current) => current.zIndex.drawer + 1,
        }}
      >
        <Toolbar variant="dense">
          {permanentNavigation ? null : (
            <IconButton
              edge="start"
              aria-label="Open navigation"
              onClick={() => setNavigationOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="subtitle1"
            component={Link}
            to="/"
            noWrap
            sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}
          >
            {props.appName}
          </Typography>
          <ColorModeToggle />
        </Toolbar>
      </AppBar>

      <Navigation
        routes={props.listRoutes}
        permanent={permanentNavigation}
        open={navigationOpen}
        onClose={() => setNavigationOpen(false)}
      />

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar variant="dense" />
        <Container maxWidth="lg" sx={{ py: 3 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}

function PageLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress />
    </Box>
  );
}

function NotFound() {
  return (
    <Box sx={{ py: 6, textAlign: 'center' }}>
      <Typography variant="h6">Page not found</Typography>
      <Typography color="text.secondary">The requested page does not exist.</Typography>
    </Box>
  );
}

interface NavigationProps {
  routes: readonly RouteDescriptor[];
  permanent: boolean;
  open: boolean;
  onClose: () => void;
}

function Navigation(props: NavigationProps) {
  const location = useLocation();

  return (
    <Drawer
      variant={props.permanent ? 'permanent' : 'temporary'}
      open={props.permanent || props.open}
      onClose={props.onClose}
      sx={{
        width: NAVIGATION_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: NAVIGATION_WIDTH,
          boxSizing: 'border-box',
          borderRight: 1,
          borderColor: 'divider',
        },
      }}
    >
      <Toolbar variant="dense" />
      <Divider />
      <List dense>
        {props.routes.map((route) => (
          <ListItemButton
            key={route.id}
            component={Link}
            to={route.path}
            selected={location.pathname === route.path}
            onClick={props.onClose}
          >
            <ListItemText primary={route.title} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  // mode is undefined until the client resolves the color scheme
  const resolved = mode === 'system' ? systemMode : mode;
  if (!resolved) {
    return null;
  }

  const next = resolved === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton aria-label={`Switch to ${next} mode`} onClick={() => setMode(next)}>
        {resolved === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
