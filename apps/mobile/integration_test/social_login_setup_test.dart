import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:luckieverse_tab_flutter/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('app starts with blank social login credentials', (tester) async {
    await app.main();
    await tester.pumpAndSettle();
    expect(find.text('웹 주소가 설정되지 않았어'), findsOneWidget);
  });
}
