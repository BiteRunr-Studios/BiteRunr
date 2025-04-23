const apiUrl = "https://biterunrapi.omniquark.me";
const clerkId = "user_2vPDRe0u445QpaBCnajlHXWkNOA";

export const getFriends = async () => {
    const response = await fetch(`${apiUrl}/users/clerk/${clerkId}/friends`);
    if (!response.ok) { 
        throw new Error("Failed to fetch friends");
    }
    const data = await response.json();
    console.log(data);
    return data;
};

