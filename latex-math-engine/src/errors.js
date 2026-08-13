class Errors {
    constructor() {
        this.errors = []; // Initialize the errors array
    }

    setErrors(error) {
        this.errors.push(error); // Add a new error to the array
    }

    getErrors() {
        return this.errors; // Retrieve all stored errors
    }

    clearErrors() {
        this.errors = []; // Clear all stored errors
    }

}

// Export a singleton instance of Errors
const errors = new Errors();
export default errors;
