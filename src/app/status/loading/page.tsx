"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress, Container, Paper, Typography } from "@mui/material";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";

export default function LoadingPage() {
  const router = useRouter();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  return (<Container 
    maxWidth="sm" 
    className="h-screen flex items-center justify-center"
  >
    <Paper
      elevation={6}
      sx={{
        p: 4,
        textAlign: "center",
        bgcolor: isDarkMode ? "#010205" : "#FFFFFF",
        color: isDarkMode ? "grey.300" : "grey.900",
        borderRadius: 2,
        boxShadow: isDarkMode
          ? "0px 0px 40px rgba(255, 255, 255, 0.5)"
          : "0px 0px 20px rgba(0, 0, 0, 0.5)",
          mt: 4,
      }}
    >
      <Box display="flex" justifyContent="center" mb={2}>
        <CircularProgress size={80} color="primary" />
      </Box>

      <Typography variant="h5" fontWeight="bold">
        Loading...
      </Typography>
      <Typography variant="body1">
        Please wait while we process your request. Do Not Refresh!
      </Typography>
    </Paper>
  </Container>
  );
}
