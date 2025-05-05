import { AppBar, Box, Container, Divider, Link, Toolbar, Typography } from "@mui/material";
import React from "react";
import { Help } from "../components/help";
import { ReturnBackButton } from "../components/return-back/return-back-button";
import { LanguageSelector } from "../editor/components/language-selector";

function App(props: { children: React.ReactNode }) {
  return (
    <>
      <AppBar position="static" sx={{ background: "#3f51b5 linear-gradient(5deg, #5d2f86, #3f51b5);" }}>
        <Toolbar>
          <Typography variant="h6" component={Link} href={import.meta.env.VITE_MANAGER_URL + "/"} sx={{ color: "white", textDecoration: "none", fontWeight: "normal" }}>
            <strong>Dataspecer</strong> specification manager
          </Typography>
          <ReturnBackButton />
          <Box display="flex" sx={{ flexGrow: 1, gap: 4 }} justifyContent="flex-end">
            <Help />
            <LanguageSelector />
          </Box>
        </Toolbar>
      </AppBar>
      <Container>
        {props.children}
        <Divider style={{ margin: "1rem 0 1rem 0" }} />
        {import.meta.env.VITE_DEBUG_VERSION !== undefined && (
          <>
            Version: <span>{import.meta.env.VITE_DEBUG_VERSION}</span>
          </>
        )}
      </Container>
    </>
  );
}

export default App;
