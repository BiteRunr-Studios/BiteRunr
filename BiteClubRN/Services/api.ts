const apiUrl = "https://biterunrapi.omniquark.me";

export const getFriends = async (userId: string) => {
    const response = await fetch(`${apiUrl}/users/clerk/${userId}/friends`);
    if (!response.ok) { 
        throw new Error("Failed to fetch friends");
    }
    const data = await response.json();
    console.log(data);
    return data;
};

