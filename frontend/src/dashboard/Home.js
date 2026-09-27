import React from "react";
import SideBar from "./SideBar";

function Home({ children }) {
  return (
    <div>
      <SideBar />

      <div
        style={{
          marginLeft: "280px",
          minHeight: "100vh",
          padding: "20px",
          backgroundColor: "#f8f9fa"
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default Home;