import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Camera, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import FaceTrainingGuide from '@/components/FaceTrainingGuide';
import { useAuth } from '@/hooks/use-auth';
import { useMobile } from '@/hooks/use-mobile';
import { Person, FaceImage } from '@shared/schema';

const FaceTraining: React.FC = () => {
  const { personId } = useParams<{ personId: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { isMobile } = useMobile();
  const [isTraining, setIsTraining] = useState(false);
  
  // Fetch person data
  const {
    data: person,
    isLoading,
    error,
  } = useQuery<Person>({
    queryKey: ['/api/people', parseInt(personId)],
    enabled: !!personId && !!user,
  });
  
  // Fetch face images for this person
  const {
    data: faceImages,
    isLoading: isLoadingImages,
  } = useQuery<FaceImage[]>({
    queryKey: ['/api/people', parseInt(personId), 'faceImages'],
    enabled: !!personId && !!user,
  });
  
  // Redirect if no user or invalid personId
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else if (personId && isNaN(parseInt(personId))) {
      navigate('/');
    }
  }, [user, personId, navigate]);
  
  const handleStartTraining = () => {
    setIsTraining(true);
  };
  
  const handleCancelTraining = () => {
    setIsTraining(false);
  };
  
  const handleCompleteTraining = () => {
    setIsTraining(false);
    // Navigate back to the person management page
    navigate('/people');
  };
  
  const handleBackToProfile = () => {
    navigate('/people');
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container page-container flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show error state
  if (error || !person) {
    return (
      <div className="container page-container py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : 'Could not load person data. Please try again.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => navigate('/')} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }
  
  // Calculate face training stats
  const totalFaceImages = faceImages?.length || 0;
  const faceTypes = new Set(faceImages?.map((image: FaceImage) => image.expressionType) || []);
  const uniqueExpressions = faceTypes.size;
  
  return (
    <div className="container page-container py-8">
      {!isTraining ? (
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold">Face Training for {person.name}</h1>
              <p className="text-muted-foreground">
                Train the AI to recognize {person.name}'s face for better videos
              </p>
            </div>
            <Button onClick={handleBackToProfile} variant="outline" className="self-start">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Face Training</CardTitle>
                <CardDescription>
                  Record different facial expressions to improve face swapping quality
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-lg space-y-2">
                  <p className="font-medium">Why train facial expressions?</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Multiple angles capture more facial details</li>
                    <li>Different expressions improve natural-looking results</li>
                    <li>The AI learns to adapt to lighting changes</li>
                    <li>Better quality in the final videos</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center justify-center border rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary">{totalFaceImages}</div>
                    <div className="text-xs text-center text-muted-foreground">
                      Total Face Images
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center border rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary">{uniqueExpressions}</div>
                    <div className="text-xs text-center text-muted-foreground">
                      Unique Expressions
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button onClick={handleStartTraining} className="w-full">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Face Training
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Face Collection</CardTitle>
                <CardDescription>
                  View and manage existing face images for {person.name}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {isLoadingImages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : faceImages && faceImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {faceImages.slice(0, 4).map((image: FaceImage) => (
                      <div key={image.id} className="aspect-square rounded-md overflow-hidden relative group">
                        <img 
                          src={image.imageUrl} 
                          alt={image.name} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-2 w-full text-white">
                            <div className="text-xs font-medium truncate">{image.name}</div>
                            <div className="text-xs opacity-75">
                              {image.expressionType || 'unknown'}
                            </div>
                          </div>
                        </div>
                        
                        {image.isDefault && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                            Default
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No face images available yet.</p>
                    <p className="text-sm">Start face training to add some!</p>
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/people')}
                >
                  Back to People Management
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <FaceTrainingGuide
          userId={user?.id || 0}
          personId={parseInt(personId)}
          personName={person.name}
          onComplete={handleCompleteTraining}
          onCancel={handleCancelTraining}
        />
      )}
    </div>
  );
};

export default FaceTraining;