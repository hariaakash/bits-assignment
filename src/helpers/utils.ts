export const getCurrentMonth = () => {
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // format as MM
    const year = date.getFullYear().toString();
    return {
        year,
        month,
    };
};