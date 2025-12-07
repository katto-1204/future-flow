import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  User,
  GraduationCap,
  Award,
  Heart,
  Briefcase,
  FileText,
  Edit,
  Plus,
  X,
  Upload,
  Loader2,
  BookOpen,
  Target,
} from "lucide-react";
import type { Profile } from "@shared/schema";

const profileSchema = z.object({
  bio: z.string().optional(),
  gpa: z.string().optional(),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  careerPreferences: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function SkillsSection({
  title,
  icon: Icon,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  icon: React.ElementType;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [newItem, setNewItem] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem("");
      setIsAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-display">{title}</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsAdding(!isAdding)}
          data-testid={`button-add-${title.toLowerCase().replace(/\s+/g, "-")}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              data-testid={`input-new-${title.toLowerCase().replace(/\s+/g, "-")}`}
            />
            <Button onClick={handleAdd} size="sm">
              Add
            </Button>
          </div>
        )}
        {items.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="gap-1 pl-2.5"
                data-testid={`badge-${title.toLowerCase()}-${index}`}
              >
                {item}
                <button
                  onClick={() => onRemove(index)}
                  className="ml-1 rounded-full p-0.5 hover:bg-foreground/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No {title.toLowerCase()} added yet. Click + to add.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: ["/api/profile"],
  });

  const [localSkills, setLocalSkills] = useState<string[]>([]);
  const [localInterests, setLocalInterests] = useState<string[]>([]);
  const [localCareerPrefs, setLocalCareerPrefs] = useState<string[]>([]);
  const [localCerts, setLocalCerts] = useState<string[]>([]);

  // Sync local state when profile loads
  useState(() => {
    if (profile) {
      setLocalSkills(profile.skills || []);
      setLocalInterests(profile.interests || []);
      setLocalCareerPrefs(profile.careerPreferences || []);
      setLocalCerts(profile.certifications || []);
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileFormData>) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({ title: "Profile updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpdateArray = (field: string, items: string[]) => {
    updateProfileMutation.mutate({ [field]: items });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Layout title="Profile">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const skills = profile?.skills || localSkills;
  const interests = profile?.interests || localInterests;
  const careerPrefs = profile?.careerPreferences || localCareerPrefs;
  const certs = profile?.certifications || localCerts;

  return (
    <Layout title="Profile">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.avatarUrl || undefined} alt={user?.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                    {user?.name ? getInitials(user.name) : "??"}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 font-display text-xl font-semibold" data-testid="text-profile-name">
                  {user?.name}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant="secondary">
                    <GraduationCap className="mr-1 h-3 w-3" />
                    {user?.yearLevel ? `Year ${user.yearLevel}` : "Student"}
                  </Badge>
                  <Badge variant="outline">{user?.course || "Computer Engineering"}</Badge>
                </div>
                <Button variant="outline" className="mt-4 w-full" data-testid="button-edit-profile">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Academic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">GPA</span>
                <span className="font-medium" data-testid="text-gpa">
                  {profile?.gpa?.toFixed(2) || "Not set"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subjects Taken</span>
                <span className="font-medium">{profile?.subjectsTaken?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Certifications</span>
                <span className="font-medium">{certs.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Skills</span>
                <Badge>{skills.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Career Interests</span>
                <Badge>{careerPrefs.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {profile?.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          <SkillsSection
            title="Skills"
            icon={Award}
            items={skills}
            onAdd={(item) => {
              const updated = [...skills, item];
              setLocalSkills(updated);
              handleUpdateArray("skills", updated);
            }}
            onRemove={(index) => {
              const updated = skills.filter((_, i) => i !== index);
              setLocalSkills(updated);
              handleUpdateArray("skills", updated);
            }}
            placeholder="e.g., Python, JavaScript, Circuit Design"
          />

          <SkillsSection
            title="Interests"
            icon={Heart}
            items={interests}
            onAdd={(item) => {
              const updated = [...interests, item];
              setLocalInterests(updated);
              handleUpdateArray("interests", updated);
            }}
            onRemove={(index) => {
              const updated = interests.filter((_, i) => i !== index);
              setLocalInterests(updated);
              handleUpdateArray("interests", updated);
            }}
            placeholder="e.g., Artificial Intelligence, Embedded Systems"
          />

          <SkillsSection
            title="Career Preferences"
            icon={Briefcase}
            items={careerPrefs}
            onAdd={(item) => {
              const updated = [...careerPrefs, item];
              setLocalCareerPrefs(updated);
              handleUpdateArray("careerPreferences", updated);
            }}
            onRemove={(index) => {
              const updated = careerPrefs.filter((_, i) => i !== index);
              setLocalCareerPrefs(updated);
              handleUpdateArray("careerPreferences", updated);
            }}
            placeholder="e.g., Software Engineer, Systems Architect"
          />

          <SkillsSection
            title="Certifications"
            icon={FileText}
            items={certs}
            onAdd={(item) => {
              const updated = [...certs, item];
              setLocalCerts(updated);
              handleUpdateArray("certifications", updated);
            }}
            onRemove={(index) => {
              const updated = certs.filter((_, i) => i !== index);
              setLocalCerts(updated);
              handleUpdateArray("certifications", updated);
            }}
            placeholder="e.g., AWS Certified, Cisco CCNA"
          />
        </div>
      </div>
    </Layout>
  );
}
