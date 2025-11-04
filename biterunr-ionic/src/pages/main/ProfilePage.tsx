import {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
} from "@ionic/react";

const ProfilePage: React.FC = () => {
    return (
        <IonPage>
            <IonContent fullscreen>
                <IonHeader collapse="condense">
                    <IonToolbar>
                        <IonTitle size="large">Profile</IonTitle>
                    </IonToolbar>
                </IonHeader>
                Profile
            </IonContent>
        </IonPage>
    );
};

export default ProfilePage;
