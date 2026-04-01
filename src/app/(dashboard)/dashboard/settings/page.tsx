"use client";

import { useState, useEffect } from "react";
import { Settings2, Save, Loader2, BookOpen } from "lucide-react";
import { format } from "date-fns";

import {
  useSettings,
  useUpdateSetting,
  useReferenceData,
  type SystemSetting,
  type ReferenceDataEntry,
} from "@/hooks/useSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// ─── Page component ───────────────────────────────────────

export default function SettingsPage() {
  useEffect(() => { document.title = "Settings | OIG-ITS"; }, []);
  const { data: settingsData, isLoading: settingsLoading } = useSettings();
  const { data: refData, isLoading: refLoading } = useReferenceData();

  const settings = settingsData?.data ?? [];
  const grouped = refData?.grouped ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          System settings and reference data configuration
        </p>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 flex-1" />
                </div>
              ))}
            </div>
          ) : settings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No system settings configured.
            </p>
          ) : (
            <div className="space-y-3">
              {settings.map((setting) => (
                <SettingRow key={setting.id} setting={setting} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Data */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">
              Reference Data
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {refLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No reference data defined.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([category, entries]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {category.replace(/_/g, " ")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {entries.map((entry: ReferenceDataEntry) => (
                      <Badge
                        key={entry.id}
                        variant={entry.isActive ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {entry.label}
                        {!entry.isActive && (
                          <span className="ml-1 text-muted-foreground">
                            (inactive)
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  <Separator className="mt-3" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Setting row with inline editing ──────────────────────

function SettingRow({ setting }: { setting: SystemSetting }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    typeof setting.value === "string"
      ? setting.value
      : JSON.stringify(setting.value),
  );
  const updateSetting = useUpdateSetting();

  function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }

    updateSetting.mutate(
      { key: setting.key, value: parsed },
      {
        onSuccess: () => setEditing(false),
      },
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-48 shrink-0">
        <p className="text-sm font-medium">{setting.key}</p>
        <p className="text-[10px] text-muted-foreground">
          Updated {format(new Date(setting.updatedAt), "MMM d, yyyy")}
        </p>
      </div>
      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={updateSetting.isPending}
            className="gap-1.5"
          >
            {updateSetting.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div
          className="flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
          onClick={() => setEditing(true)}
        >
          {typeof setting.value === "string"
            ? setting.value
            : JSON.stringify(setting.value)}
        </div>
      )}
    </div>
  );
}
