import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { CreditCard, Users, Package, PlusCircle, Edit, Trash2, Loader2, BarChart4 } from "lucide-react";

// Interface for subscription plans
interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  active: boolean;
}

// Interface for subscription statistics
interface SubscriptionStatistic {
  totalSubscribers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  averageSubscriptionLength: number;
  retentionRate: number;
}

// Mock subscription plans data (replace with actual API calls)
const mockSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Basic',
    description: 'Access to basic content with limited features',
    price: 4.99,
    billingCycle: 'monthly',
    features: ['Access to 10 premium videos', 'Basic customization', 'Web access only'],
    active: true
  },
  {
    id: 2,
    name: 'Premium',
    description: 'Full access to all premium content and features',
    price: 9.99,
    billingCycle: 'monthly',
    features: ['All premium videos', 'Advanced customization', 'Priority processing', 'Mobile app access'],
    active: true
  },
  {
    id: 3,
    name: 'Family',
    description: 'Share premium access with up to 5 family members',
    price: 19.99,
    billingCycle: 'monthly',
    features: ['All premium videos', 'Advanced customization', 'Priority processing', 'Mobile app access', 'Up to 5 family profiles'],
    active: true
  },
  {
    id: 4,
    name: 'Enterprise',
    description: 'For schools and educational institutions',
    price: 49.99,
    billingCycle: 'monthly',
    features: ['All premium videos', 'Advanced customization', 'Priority processing', 'Mobile app access', 'Unlimited profiles', 'Admin dashboard', 'Analytics', 'Custom branding'],
    active: false
  }
];

// Mock subscription statistics (replace with actual API calls)
const mockSubscriptionStatistics: SubscriptionStatistic = {
  totalSubscribers: 125,
  activeSubscriptions: 98,
  monthlyRevenue: 1245.75,
  averageSubscriptionLength: 4.2,
  retentionRate: 78.5
};

const SubscriptionManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('plans');
  const [isAddPlanDialogOpen, setIsAddPlanDialogOpen] = useState(false);
  const [isEditPlanDialogOpen, setIsEditPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(mockSubscriptionPlans);
  const [subscriptionStatistics, setSubscriptionStatistics] = useState<SubscriptionStatistic>(mockSubscriptionStatistics);
  
  // Form state for subscription plan
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    description: '',
    price: 9.99,
    billingCycle: 'monthly',
    features: [''],
    active: true
  });
  
  // Fetch subscribers data (eventually replace with real API call)
  const { data: subscribers, isLoading: loadingSubscribers } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });
  
  const activeSubscribers = subscribers?.filter(user => 
    user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial'
  ) || [];
  
  // Handle adding feature in form
  const handleAddFeature = () => {
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), '']
    }));
  };
  
  // Handle removing feature in form
  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index)
    }));
  };
  
  // Handle updating feature text in form
  const handleFeatureChange = (index: number, value: string) => {
    setFormData(prev => {
      const features = [...(prev.features || [])];
      features[index] = value;
      return {
        ...prev,
        features
      };
    });
  };
  
  // Handle form submission for new plan
  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, this would be an API call
    const newPlan: SubscriptionPlan = {
      id: Math.max(0, ...subscriptionPlans.map(p => p.id)) + 1,
      name: formData.name || '',
      description: formData.description || '',
      price: formData.price || 0,
      billingCycle: formData.billingCycle || 'monthly',
      features: formData.features || [],
      active: formData.active || false
    };
    
    setSubscriptionPlans([...subscriptionPlans, newPlan]);
    setIsAddPlanDialogOpen(false);
    setFormData({
      name: '',
      description: '',
      price: 9.99,
      billingCycle: 'monthly',
      features: [''],
      active: true
    });
    
    toast({
      title: "Success",
      description: "Subscription plan created successfully",
    });
  };
  
  // Handle form submission for editing plan
  const handleUpdatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    
    // In a real application, this would be an API call
    const updatedPlans = subscriptionPlans.map(plan => 
      plan.id === selectedPlan.id ? {
        ...plan,
        name: formData.name || plan.name,
        description: formData.description || plan.description,
        price: formData.price !== undefined ? formData.price : plan.price,
        billingCycle: formData.billingCycle || plan.billingCycle,
        features: formData.features || plan.features,
        active: formData.active !== undefined ? formData.active : plan.active
      } : plan
    );
    
    setSubscriptionPlans(updatedPlans);
    setIsEditPlanDialogOpen(false);
    setSelectedPlan(null);
    
    toast({
      title: "Success",
      description: "Subscription plan updated successfully",
    });
  };
  
  // Open edit dialog and set form data
  const openEditDialog = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: [...plan.features],
      active: plan.active
    });
    setIsEditPlanDialogOpen(true);
  };
  
  // Toggle plan active status
  const togglePlanStatus = (planId: number) => {
    const updatedPlans = subscriptionPlans.map(plan => 
      plan.id === planId ? { ...plan, active: !plan.active } : plan
    );
    setSubscriptionPlans(updatedPlans);
    
    toast({
      title: "Success",
      description: `Plan ${updatedPlans.find(p => p.id === planId)?.active ? 'activated' : 'deactivated'} successfully`,
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <Package size={16} />
            Subscription Plans
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users size={16} />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart4 size={16} />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        {/* Subscription Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>
                  Manage and configure your subscription plans and pricing
                </CardDescription>
              </div>
              <Dialog open={isAddPlanDialogOpen} onOpenChange={setIsAddPlanDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <PlusCircle size={16} />
                    Add Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Create New Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Add a new subscription plan for your users.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePlan} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Billing Cycle</Label>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="monthly"
                              name="billingCycle"
                              checked={formData.billingCycle === 'monthly'}
                              onChange={() => setFormData({...formData, billingCycle: 'monthly'})}
                            />
                            <Label htmlFor="monthly">Monthly</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="yearly"
                              name="billingCycle"
                              checked={formData.billingCycle === 'yearly'}
                              onChange={() => setFormData({...formData, billingCycle: 'yearly'})}
                            />
                            <Label htmlFor="yearly">Yearly</Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="active">Status</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                          />
                          <Label htmlFor="active">Active</Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Features</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddFeature}
                        >
                          Add Feature
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {formData.features?.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => handleFeatureChange(index, e.target.value)}
                              placeholder="Enter feature description"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFeature(index)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Create Plan</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              
              {/* Edit Plan Dialog */}
              <Dialog open={isEditPlanDialogOpen} onOpenChange={setIsEditPlanDialogOpen}>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Edit Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Update the details of the selected subscription plan.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUpdatePlan} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Plan Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Billing Cycle</Label>
                        <div className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="monthly"
                              name="billingCycle"
                              checked={formData.billingCycle === 'monthly'}
                              onChange={() => setFormData({...formData, billingCycle: 'monthly'})}
                            />
                            <Label htmlFor="monthly">Monthly</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id="yearly"
                              name="billingCycle"
                              checked={formData.billingCycle === 'yearly'}
                              onChange={() => setFormData({...formData, billingCycle: 'yearly'})}
                            />
                            <Label htmlFor="yearly">Yearly</Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="active">Status</Label>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData({...formData, active: checked})}
                          />
                          <Label htmlFor="active">Active</Label>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Features</Label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddFeature}
                        >
                          Add Feature
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {formData.features?.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={feature}
                              onChange={(e) => handleFeatureChange(index, e.target.value)}
                              placeholder="Enter feature description"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFeature(index)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Update Plan</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {subscriptionPlans.map((plan) => (
                  <Card key={plan.id} className={`overflow-hidden border-2 ${plan.active ? 'border-primary/50' : 'border-gray-200'}`}>
                    <CardHeader className="bg-primary/5 pb-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <Badge variant={plan.active ? "default" : "outline"}>
                          {plan.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-end gap-1 mt-2">
                        <span className="text-3xl font-bold">${plan.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">/{plan.billingCycle}</span>
                      </div>
                      <CardDescription className="mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2">Features:</h4>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-4">
                      <Button 
                        variant="outline" 
                        onClick={() => openEditDialog(plan)}
                      >
                        Edit
                      </Button>
                      <Button 
                        variant={plan.active ? "destructive" : "default"}
                        onClick={() => togglePlanStatus(plan.id)}
                      >
                        {plan.active ? "Deactivate" : "Activate"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Subscribers Tab */}
        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Subscribers</CardTitle>
              <CardDescription>
                View and manage users with active subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSubscribers ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeSubscribers.length > 0 ? (
                <Table>
                  <TableCaption>List of users with active subscriptions</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Next Billing</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSubscribers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.id}</TableCell>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.subscriptionStatus === 'active' ? 'default' : 'outline'}>
                            {user.subscriptionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>Premium</TableCell>
                        <TableCell>05/01/2023</TableCell>
                        <TableCell>06/01/2023</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p>No active subscribers found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Analytics</CardTitle>
              <CardDescription>
                Track subscription metrics and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Subscribers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptionStatistics.totalSubscribers}</div>
                    <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Subscriptions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptionStatistics.activeSubscriptions}</div>
                    <p className="text-xs text-muted-foreground mt-1">+8% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Monthly Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${subscriptionStatistics.monthlyRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">+15% from last month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Retention Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{subscriptionStatistics.retentionRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">+2.5% from last month</p>
                  </CardContent>
                </Card>
              </div>
              
              {/* Placeholder for charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-64 flex items-center justify-center border-dashed border-2">
                  <p className="text-muted-foreground">Subscription Growth Chart</p>
                </Card>
                <Card className="h-64 flex items-center justify-center border-dashed border-2">
                  <p className="text-muted-foreground">Revenue Chart</p>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SubscriptionManagement;