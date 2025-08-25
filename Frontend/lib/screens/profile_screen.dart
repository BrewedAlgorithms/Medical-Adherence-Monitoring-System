import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:healthmobi/api/api_provider.dart';
import 'package:healthmobi/models/medication_course_model.dart';
import 'package:healthmobi/models/user_model.dart';
import 'package:healthmobi/provider/medication_course_provider.dart';
import 'package:healthmobi/provider/medication_course_state_provider.dart';
import 'package:healthmobi/provider/profile_provider.dart';
import 'package:healthmobi/provider/profile_state_provider.dart';
import 'package:healthmobi/reusable/constant.dart';
import 'package:healthmobi/screens/rewards_screen.dart';
import 'package:healthmobi/widget/skeleton_placeholder.dart';
import 'package:resize/resize.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../widget/medication_medi_screen_card.dart';
import 'logo_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  @override
  void initState() {
    ref.read(apiProvider).getMedicationCourse();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    ApiState profileState = ref.watch(profileStateProvider);
    ProfileModel? profile = ref.watch(profileProvider);
    ApiState medicationCourseState = ref.watch(medicationCourseStateProvider);
    MedicationCourseModel? medicationCourse =
        ref.watch(medicationCourseProvider);
    return SafeArea(
      child: Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          centerTitle: true,
          scrolledUnderElevation: 0,
          leading: IconButton(
            onPressed: () {
              Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => RewardsPage(),
                  ));
            },
            icon: Icon(
              Icons.card_giftcard_rounded,
              color: Colors.black,
              size: 30,
            ),
          ),
          actions: [
            IconButton(
              onPressed: () {
                SharedPreferences.getInstance().then((prefs) {
                  prefs.setBool('loginData', false);
                  Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(
                          builder: (context) => const LogoScreen()),
                      (Route<dynamic> route) => false);
                });
              },
              icon: Icon(
                Icons.logout,
                color: Colors.black,
              ),
            ),
          ],
          title: Text(
            "Profile",
            style: GoogleFonts.manrope(
              color: Colors.black,
              fontSize: 24,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: Container(
          alignment: Alignment.center,
          padding: EdgeInsets.only(top: 19.h, left: 16.w, right: 16.w),
          child: RefreshIndicator(
            onRefresh: () async {
              await ref.read(apiProvider).getMedicationCourse();
              await ref.read(apiProvider).getProfile();
            },
            child: SingleChildScrollView(
              physics: AlwaysScrollableScrollPhysics(),
              child: Column(
                children: [
                  GestureDetector(
                    onDoubleTap: () {
                      showDialog(
                        context: context,
                        builder: (BuildContext context) {
                          TextEditingController textFieldController =
                              TextEditingController();
                          return AlertDialog(
                            title: Text('Enter Information'),
                            content: TextField(
                              controller: textFieldController,
                              decoration: InputDecoration(
                                  hintText: "Enter your text here"),
                            ),
                            actions: [
                              TextButton(
                                onPressed: () {
                                  // Handle "Cancel" action
                                  Navigator.of(context).pop();
                                },
                                child: Text('Cancel'),
                              ),
                              TextButton(
                                onPressed: () async {
                                  // Handle "OK" action
                                  String enteredText =
                                      textFieldController.text;
                                  SharedPreferences pref =
                                      await SharedPreferences.getInstance();
                                  pref.setString('aiurl', enteredText.trim());
                                  Navigator.of(context).pop();
                                },
                                child: Text('OK'),
                              ),
                            ],
                          );
                        },
                      );
                    },
                    child: Container(
                      height: 100,
                      width: 100,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.black, width: 2),
                      ),
                      child: Icon(
                        Icons.person,
                        size: 60,
                      ),
                    ),
                  ),
                  // ElevatedButton(
                  //     onPressed: () {},
                  //     //edit button
                  //     child: Text("Edit Profile"),
                  //     style: ElevatedButton.styleFrom(
                  //       backgroundColor: primaryColor,
                  //       foregroundColor: Colors.white,
                  //       shape: RoundedRectangleBorder(
                  //         borderRadius: BorderRadius.circular(10),
                  //       ),
                  //     )),
                  SizedBox(
                    height: 20,
                  ),
                  Text(
                    profileState == ApiState.loading
                        ? "Loading..."
                        : profileState == ApiState.error
                            ? "Prajwal Chinchmalatpure"
                            : profile?.name ?? "Prajwal Chinchmalatpure",
                    style: TextStyle(
                      color: fontColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(
                    height: 5,
                  ),
                  Text(
                    profileState == ApiState.loading
                        ? ""
                        : profileState == ApiState.error
                            ? "8055301261"
                            : profile?.phone.toString() ?? "8055301261",
                    style: TextStyle(
                      color: secondaryfontColor,
                      fontSize: 16,
                    ),
                  ),
                  SizedBox(
                    height: 10,
                  ),
                  Divider(),
                  SizedBox(
                    height: 20,
                  ),
                  Text(
                    "Your Medications",
                    style: GoogleFonts.manrope(
                      color: fontColor,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  SizedBox(
                    height: 20,
                  ),
                  medicationCourseState == ApiState.loading
                      ? SkeletonScreen()
                      : medicationCourseState == ApiState.error
                          ? Column(
                              spacing: 20,
                              children: [
                                MedicationMediScreenCard(
                                    name: "Calpol 650mg",
                                    doses: 2,
                                    isafternoon: true,
                                    ismorning: true,
                                    isnight: true,
                                    isevening: true,
                                    desctiption: "After meal"),
                                MedicationMediScreenCard(
                                    name: "Paracetamol 500mg",
                                    doses: 1,
                                    ismorning: true,
                                    isnight: true,
                                    desctiption: "Before meal"),
                                MedicationMediScreenCard(
                                    name: "Dolo 650mg",
                                    doses: 1,
                                    ismorning: true,
                                    desctiption: "After meal"),
                                MedicationMediScreenCard(
                                    name: "Crocin 650mg",
                                    doses: 1,
                                    isnight: true,
                                    desctiption: "After meal"),
                              ],
                            )
                          : Column(
                              spacing: 20,
                              children: medicationCourse?.courses != null ||
                                      medicationCourse!.courses!.isNotEmpty
                                  ? medicationCourse!.courses!.map(
                                      (e) {
                                        return Column(
                                          children: [
                                            Row(
                                              children: [
                                                Text(
                                                  "11-4-2025 Course",
                                                  style: GoogleFonts.manrope(
                                                      fontSize: 16,
                                                      fontWeight:
                                                          FontWeight.bold),
                                                ),
                                              ],
                                            ),
                                            SizedBox(
                                              height: 10,
                                            ),
                                            Column(
                                                spacing: 10,
                                                children:
                                                    e.medicineCourses != null ||
                                                            e.medicineCourses!
                                                                .isNotEmpty
                                                        ? e.medicineCourses!
                                                            .map(
                                                              (med) =>
                                                                  MedicationMediScreenCard(
                                                                name:
                                                                    med.medicineName ??
                                                                        "",
                                                                doses:
                                                                    med.pillcount ??
                                                                        1,
                                                                desctiption: med
                                                                            .medtype ==
                                                                        "0"
                                                                    ? "Before Meal"
                                                                    : med.medtype ==
                                                                            "1"
                                                                        ? "After Meal"
                                                                        : "",
                                                                ismorning:
                                                                    med.frequency?[0] ==
                                                                            "1"
                                                                        ? true
                                                                        : false,
                                                                isafternoon:
                                                                    med.frequency?[1] ==
                                                                            "1"
                                                                        ? true
                                                                        : false,
                                                                isevening:
                                                                    med.frequency?[2] ==
                                                                            "1"
                                                                        ? true
                                                                        : false,
                                                                isnight:
                                                                    med.frequency?[3] ==
                                                                            "1"
                                                                        ? true
                                                                        : false,
                                                              ),
                                                            )
                                                            .toList()
                                                        : [])
                                          ],
                                        );
                                      },
                                    ).toList()
                                  : [
                                      Text(
                                        "No ongoing Medication course",
                                        style: GoogleFonts.manrope(
                                          color: fontColor,
                                          fontSize: 16,
                                        ),
                                      )
                                    ])
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
