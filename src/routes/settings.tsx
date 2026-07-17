import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { teacher, updateTeacher } = useStore();
  if (!teacher) return null;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Personalize your workspace and accessibility preferences.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                value={teacher.displayName}
                onChange={(e) => updateTeacher({ displayName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>School</Label>
              <Input
                value={teacher.school}
                onChange={(e) => updateTeacher({ school: e.target.value })}
                placeholder="e.g. Lincoln Middle School"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={teacher.email} disabled />
            </div>
            <Button
              onClick={() => toast.success("Profile saved")}
              className="mt-2"
            >
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <Row
              title="Dark mode"
              description="Reduce glare while planning at night."
              checked={teacher.theme === "dark"}
              onChange={(v) => updateTeacher({ theme: v ? "dark" : "light" })}
            />
            <Row
              title="Dyslexia-friendly font"
              description="Uses a rounded font with wider spacing everywhere."
              checked={teacher.dyslexiaFont}
              onChange={(v) => updateTeacher({ dyslexiaFont: v })}
            />
            <Row
              title="Focus mode"
              description="Hides secondary UI so you can concentrate on lesson content."
              checked={teacher.focusMode}
              onChange={(v) => updateTeacher({ focusMode: v })}
            />
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-6 space-y-5">
            <h2 className="text-lg font-semibold">Notifications</h2>
            <Row
              title="Email notifications"
              description="Get a weekly summary of student activity."
              checked={teacher.notifications}
              onChange={(v) => updateTeacher({ notifications: v })}
            />
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Accessibility promise</h2>
            <p className="text-sm text-muted-foreground">
              Mathly is built with WCAG-compliant contrast, large hit targets, full keyboard
              navigation, and support for assistive technologies. If you find a barrier, we want
              to hear about it.
            </p>
            <Button variant="outline" onClick={() => toast.info("Thanks — we're on it!")}>
              Report an accessibility issue
            </Button>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}

function Row({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-medium">{title}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
