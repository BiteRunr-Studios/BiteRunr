import {
    IonAvatar,
    IonContent,
    IonHeader,
    IonImg,
    IonItem,
    IonLabel,
    IonList,
    IonPage,
    IonTitle,
    IonToolbar,
} from "@ionic/react";
import Header from "../../components/Header";

const ProfilePage: React.FC = () => {
    return (
        <IonPage>
            <Header />

            <IonContent>
                <IonImg
                    src="https://images.unsplash.com/photo-1529393864285-168ebf229deb?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGNhbWVsfGVufDB8fDB8fHww&fm=jpg&q=60&w=3000"
                    alt="Profile Pick"
                    class="w-24 h-24 rounded-full object-cover overflow-hidden"></IonImg>
                <IonList lines="none">
                    <IonItem>
                        <IonLabel>Pokémon Yellow</IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>Mega Man X</IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>The Legend of Zelda</IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>Pac-Man</IonLabel>
                    </IonItem>
                    <IonItem>
                        <IonLabel>Super Mario World</IonLabel>
                    </IonItem>
                </IonList>
            </IonContent>
        </IonPage>
    );
};

export default ProfilePage;
