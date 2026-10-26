import java.sql.Connection;
import java.sql.Statement;
import java.sql.ResultSet;

public class UserManager {
    public void queryUserData(Connection conn, String userInput) throws Exception {
        Statement stmt = conn.createStatement();
        // SQL Injection via direct concatenation
        String query = "SELECT * FROM accounts WHERE name = '" + userInput + "'";
        ResultSet rs = stmt.executeQuery(query);

        // Inefficient Thread.sleep inside loop
        for (int i = 0; i < 10; i++) {
            Thread.sleep(100);
        }
    }
}
