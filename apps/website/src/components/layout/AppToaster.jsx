import { Toaster } from "react-hot-toast";

const AppToaster = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#1a1a1a",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          fontFamily: "Outfit, sans-serif",
          maxWidth: "320px",
          fontSize: "14px",
          padding: "10px 14px",
        },
        success: {
          iconTheme: {
            primary: "#424874",
            secondary: "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#dc2626",
            secondary: "#ffffff",
          },
        },
      }}
    />
  );
};

export default AppToaster;
