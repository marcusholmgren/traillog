import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Traillog App" },
    { name: "description", content: "Explore. Mark. Cherish." },
  ];
}

export default function Home() {
  return <Welcome />;
}
