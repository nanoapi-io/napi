import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, TextField, Spinner } from "@radix-ui/themes";
import ChangeThemeButton from "../../components/ChangeThemeButton";

export default function AccessDemo() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    console.log(name, email);
    setLoading(true);

    // Call API to store user info
    const accessRes = await fetch(`${process.env.REACT_APP_BACKEND_API_URL}/api/v1/demo/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        email,
      }),
    });

    if (accessRes.ok) {
      console.log("User info stored successfully");
    } else {
      console.error("Failed to store user info");
      setLoading(false);
      return;
    }

    const access = await accessRes.json();
    localStorage.setItem("access", access.key);

    // Redirect to the live demo
    setLoading(false);
    navigate("/dashboard");
  }

  return (
    <>
      <div className="absolute top-4 right-4">
        <ChangeThemeButton />
      </div>
      <div className="flex min-h-screen text-text-light dark:text-white  bg-gray-100 dark:bg-secondaryBackground-dark">
        <div className="min-h-screen w-2/3 flex justify-center gap-x-1">
          <img className="w-36 h-36 rounded-full my-auto opacity-80 dark:opacity-100" src="/logo.png" alt="Logo" />
          <h1 className="text-7xl font-bold my-auto text--400 dark:text-white opacity-80 dark:opacity-100">NanoAPI</h1>
        </div>
        <div className="min-h-screen w-1/3 p-4 flex bg-secondaryBackground-light dark:bg-[#0D0B1E] border-[#2D2B42]">
          <Card className="w-full max-w-md m-auto bg-[#5848E80D] border-[#2D2B42] text-white">
            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Welcome to NanoAPI
              </h2>
              <p className="text-gray-400">
                Please enter your info below to continue to the live demo
              </p>
            </div>
            <div className="space-y-4">
              <form 
                onSubmit={(e) => handleSubmit(e)}
                className="flex flex-col justify-center gap-y-4 font-bold text-lg mt-5 px-2">
                <div>
                  <TextField.Root 
                    required
                    id="name" 
                    size="3" 
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <TextField.Root 
                    required
                    id="email" 
                    size="3" 
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} />
                </div>
                <button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 rounded-md">
                  <Spinner loading={loading}>
                    <p>Continue to demo</p>
                  </Spinner>
                </button>
              </form>

              <div className="text-center text-sm text-gray-500">
                By continuing, you agree to our{" "}
                <a href="#" className="text-purple-500 hover:text-purple-400 underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-purple-500 hover:text-purple-400 underline">
                  Privacy Policy
                </a>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}