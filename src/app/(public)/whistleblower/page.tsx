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
  { value: "RETALIATION", label: "Retaliation" },
  { value: "OTHER", label: "Other" },
];

interface SuccessResult {
  inquiryNumber: string;
  message: string;
  protections?: string[];
}

export default function WhistleblowerPage() {
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
      const res = await fetch("/api/public/whistleblower", {
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
          <CardTitle className="text-green-700">
            Whistleblower Complaint Received
          </CardTitle>
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
          {success.protections && success.protections.length > 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Your Protections:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                {success.protections.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}
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
          Whistleblower Disclosure
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Report fraud, waste, abuse, or other misconduct. Your disclosure is
          protected under federal whistleblower protection laws.
        </p>
      </div>

      {/* Whistleblower protections notice */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">
            Whistleblower Protections
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              Federal employees and contractors who report waste, fraud, abuse,
              or other misconduct are protected from retaliation under the
              Whistleblower Protection Act (5 U.S.C. &sect; 2302(b)(8)) and
              related laws.
            </p>
            <p>These protections include:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                Protection from adverse personnel actions, including
                termination, demotion, or reassignment
              </li>
              <li>
                Confidentiality of your identity to the maximum extent possible
                under law
              </li>
              <li>
                Right to file a complaint with the Office of Special Counsel
                (OSC) if retaliation occurs
              </li>
              <li>
                Right to seek corrective action through the Merit Systems
                Protection Board (MSPB)
              </li>
            </ul>
            <p className="font-medium">
              You do not need to identify yourself to file a complaint, but
              providing contact information allows us to follow up if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submit a Whistleblower Disclosure</CardTitle>
          <CardDescription>
            All fields marked with * are required. Your disclosure will be
            handled with the highest level of confidentiality.
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
                placeholder="Brief summary of your disclosure"
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
                placeholder="Provide a detailed description of the misconduct, including who is involved, what occurred, when and where it happened, and any evidence or witnesses you are aware of."
                required
                minLength={10}
                rows={8}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting..." : "Submit Whistleblower Disclosure"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
