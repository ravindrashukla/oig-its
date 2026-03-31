"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CATEGORIES = [
  { value: "FRAUD", label: "Fraud" },
  { value: "WASTE", label: "Waste" },
  { value: "ABUSE", label: "Abuse" },
  { value: "MISCONDUCT", label: "Misconduct" },
  { value: "ETHICS", label: "Ethics Violation" },
  { value: "SAFETY", label: "Safety Concern" },
  { value: "OTHER", label: "Other" },
];

interface SuccessResult {
  inquiryNumber: string;
  message: string;
}

export default function HotlinePage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [complainantName, setComplainantName] = useState("");
  const [complainantEmail, setComplainantEmail] = useState("");
  const [complainantPhone, setComplainantPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/public/hotline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          complainantName: isAnonymous ? "" : complainantName,
          complainantEmail: isAnonymous ? "" : complainantEmail,
          complainantPhone: isAnonymous ? "" : complainantPhone,
          isAnonymous,
          category: category || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(body.error || "Submission failed");
      }

      const data = await res.json();
      setSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle className="text-green-700">Complaint Received</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <p className="text-sm font-medium text-green-800">
              Your inquiry number is:
            </p>
            <p className="mt-1 text-2xl font-mono font-bold text-green-900">
              {success.inquiryNumber}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{success.message}</p>
          <Button
            variant="outline"
            onClick={() => {
              setSuccess(null);
              setSubject("");
              setDescription("");
              setComplainantName("");
              setComplainantEmail("");
              setComplainantPhone("");
              setIsAnonymous(false);
              setCategory("");
            }}
          >
            Submit Another Complaint
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          OIG Hotline Complaint
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Report fraud, waste, abuse, or misconduct related to OPM programs and
          operations. You may submit your complaint anonymously.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Complaint</CardTitle>
          <CardDescription>
            All fields marked with * are required. Your complaint will be
            reviewed by the Office of Inspector General.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Anonymous toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) =>
                  setIsAnonymous(checked === true)
                }
              />
              <Label htmlFor="anonymous" className="text-sm font-normal">
                Submit anonymously (your contact information will not be
                recorded)
              </Label>
            </div>

            {/* Contact information */}
            {!isAnonymous && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={complainantName}
                    onChange={(e) => setComplainantName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={complainantEmail}
                    onChange={(e) => setComplainantEmail(e.target.value)}
                    placeholder="your.email@example.com"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={complainantPhone}
                    onChange={(e) => setComplainantPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your complaint"
                required
                minLength={5}
                maxLength={300}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a detailed description of the issue, including who is involved, what occurred, when and where it happened, and any supporting information."
                required
                minLength={10}
                rows={6}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Complaint"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
