#include <iostream>
#include <cstring>
#include <cstdio>

void readUserData() {
    char buffer[32];
    
    // Dangerous gets() function
    gets(buffer);

    char dest[16];
    // Insecure buffer copy
    strcpy(dest, buffer);
    sprintf(dest, "User: %s", buffer);
}
