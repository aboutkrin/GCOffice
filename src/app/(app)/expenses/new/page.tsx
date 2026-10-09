import { redirect } from "next/navigation";

// Expenses are added from the sheet on /expenses; keep old links working.
export default function NewExpensePage() {
  redirect("/expenses?add=1");
}
